package com.xianxia.sectgame;

import android.app.Activity;
import android.content.Context;
import android.os.Looper;
import android.util.Log;

import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.Map;

/**
 * TapTap 合规认证（实名 / 防沉迷 / 年龄段授权）的反射封装。
 *
 * <p>依赖：com.taptap.sdk:tap-compliance。SDK 初始化在 {@link SectApp} 中完成，
 * 这里只负责「注册回调 → 开始认证 → 读取年龄段 → 退出账号」。</p>
 *
 * <p>对应官方文档：https://developer.taptap.cn/docs/sdk/anti-addiction/development-guide/android-native/</p>
 */
public final class TapComplianceBridge {

    private static final String TAG = "TapCompliance";
    private static final String PKG = "com.taptap.sdk";

    /** 认证结果监听（由 Capacitor 插件注册，用于把结果抛给前端） */
    public interface ResultListener {
        void onComplianceResult(int code, String name);
    }

    private static Method startupMethod;
    private static Method ageRangeMethod;
    private static Method exitMethod;
    private static volatile boolean sdkInitialized = false;
    private static volatile ResultListener listener;
    private static volatile int lastResultCode = Integer.MIN_VALUE;
    private static volatile int ageRange = -1;
    /** 最近一次发起认证 / 最近一次收到回调的时间戳，用于识别 SDK 内部卡死 */
    private static volatile long lastStartupAt = 0;
    private static volatile long lastCallbackAt = 0;

    private TapComplianceBridge() {}

    /** 由 SectApp 在「合规参数初始化成功 + 回调注册成功」后调用 */
    public static void markInitialized() {
        sdkInitialized = true;
    }

    /** 合规模块是否可用（tap-compliance 已初始化且回调注册成功） */
    public static boolean isReady() {
        return sdkInitialized && startupMethod != null;
    }

    public static void setListener(ResultListener l) {
        listener = l;
    }

    public static int getLastResultCode() {
        return lastResultCode;
    }

    /**
     * 注册合规回调。必须在 TapTapSdk.init 之后调用一次。
     * 返回 true 表示合规模块可用。
     */
    public static boolean registerCallback(Context ctx) {
        try {
            Class<?> complianceCls = Class.forName(PKG + ".compliance.TapTapCompliance");
            Class<?> callbackCls = Class.forName(PKG + ".compliance.TapTapComplianceCallback");

            Object proxy = Proxy.newProxyInstance(
                callbackCls.getClassLoader(),
                new Class<?>[]{callbackCls},
                (p, method, args) -> {
                    if ("onComplianceResult".equals(method.getName()) && args != null && args.length >= 1) {
                        int code = ((Number) args[0]).intValue();
                        lastResultCode = code;
                        lastCallbackAt = System.currentTimeMillis();
                        // 认证通过后立即读取年龄段（useAgeRange=true 时才有真实值）
                        if (code == ComplianceCode.LOGIN_SUCCESS) {
                            ageRange = readAgeRange();
                        }
                        Log.i(TAG, "合规回调 code=" + code + "（" + codeName(code) + "）年龄段=" + ageRange);
                        TapDiag.log("合规回调 code=" + code + " " + codeName(code));
                        ResultListener l = listener;
                        if (l != null) l.onComplianceResult(code, codeName(code));
                    }
                    return null;
                }
            );

            complianceCls.getMethod("registerComplianceCallback", callbackCls).invoke(null, proxy);

            // 缓存 startup(Activity, String)：按参数个数查找，避免不同小版本签名差异
            for (Method m : complianceCls.getMethods()) {
                if ("startup".equals(m.getName()) && m.getParameterCount() == 2) {
                    startupMethod = m;
                    break;
                }
            }
            for (Method m : complianceCls.getMethods()) {
                if ("getAgeRange".equals(m.getName()) && m.getParameterCount() == 0) {
                    ageRangeMethod = m;
                } else if ("exit".equals(m.getName()) && m.getParameterCount() == 0) {
                    exitMethod = m;
                }
            }
            Log.i(TAG, "合规回调注册成功，startup 可用=" + (startupMethod != null));
            TapDiag.log("合规类已就绪，startup=" + (startupMethod != null));
            return startupMethod != null;
        } catch (ClassNotFoundException e) {
            Log.w(TAG, "未找到 tap-compliance 模块，合规认证不可用（请确认依赖已打包）");
            TapDiag.log("缺 tap-compliance 类");
            return false;
        } catch (Throwable t) {
            Log.w(TAG, "合规回调注册失败: " + t.getMessage());
            TapDiag.log("合规回调注册失败：" + t);
            return false;
        }
    }

    /** 开始实名/防沉迷认证。openId 来自 TapTap 登录的账号唯一标识。 */
    public static boolean startup(final Activity activity, final String openId) {
        if (activity == null || openId == null || openId.isEmpty()) {
            Log.w(TAG, "startup 跳过：activity 或 openId 为空");
            TapDiag.log("startup 跳过：activity/openId 为空");
            return false;
        }
        // 兜底：若应用启动时回调注册失败（SDK 初始化时序问题），这里再注册一次
        if (startupMethod == null) registerCallback(activity);
        if (startupMethod == null) {
            Log.w(TAG, "startup 跳过：合规模块不可用（tap-compliance 未初始化？）");
            TapDiag.log("startup 跳过：合规模块不可用");
            return false;
        }
        if (!sdkInitialized) {
            // 不直接放弃：SDK 可能仍可完成认证，失败时会走回调/前端兜底
            Log.w(TAG, "startup 警告：合规参数未按预期初始化，仍尝试发起认证");
            TapDiag.log("警告：合规参数未初始化，仍尝试认证");
        }
        // 上次认证超过 10 秒既无回调也无新一次发起 → SDK 内部卡死，重置运行标记后再试
        resetRunningIfStuck();
        // 清掉上一次的「可玩」判定，确保下面监视到的是本次启动的结果
        writeBool("canPlay", false);
        final long startAt = System.currentTimeMillis();
        lastStartupAt = startAt;
        Runnable task = () -> {
            try {
                startupMethod.invoke(null, activity, openId);
                Log.i(TAG, "已发起合规认证 startup(openId=" + openId + ")");
                TapDiag.log("已发起合规认证");
            } catch (Throwable t) {
                Log.w(TAG, "startup 调用失败: " + t.getMessage());
                TapDiag.log("startup 调用失败：" + t);
            }
        };
        // SDK 内部会弹实名/年龄授权弹窗，必须在主线程调用
        if (Looper.myLooper() == Looper.getMainLooper()) task.run();
        else activity.runOnUiThread(task);

        // SDK 4.10.8 在某些分支（如未实名/未成年人提醒分支）只置 canPlay=true 却不回调，
        // 这里监视它的内部状态：明确了「可玩」就补发 500，避免玩家永远卡在认证中。
        watchCanPlay(startAt);
        return true;
    }

    /** 监视 TapComplianceInternal.canPlay：SDK 判定可玩但迟迟不回调时补发 500 */
    private static void watchCanPlay(final long startAt) {
        final android.os.Handler main = new android.os.Handler(Looper.getMainLooper());
        final int[] tick = {0};
        main.postDelayed(new Runnable() {
            @Override
            public void run() {
                tick[0]++;
                // 已有真实回调 → 以 SDK 结果为准
                if (lastCallbackAt > startAt) return;
                if (readBool("canPlay")) {
                    lastResultCode = ComplianceCode.LOGIN_SUCCESS;
                    lastCallbackAt = System.currentTimeMillis();
                    ageRange = readAgeRange();
                    TapDiag.log("SDK 内部状态 canPlay=true，判定认证通过");
                    ResultListener l = listener;
                    if (l != null) l.onComplianceResult(ComplianceCode.LOGIN_SUCCESS, "LOGIN_SUCCESS");
                    return;
                }
                if (tick[0] < 20) main.postDelayed(this, 1000);
            }
        }, 1200);
    }

    /** 读取 TapComplianceInternal 的静态布尔状态（canPlay / isRunning 等） */
    private static boolean readBool(String fieldName) {
        try {
            Class<?> cls = Class.forName(PKG + ".compliance.internal.TapComplianceInternal");
            java.lang.reflect.Field f = cls.getDeclaredField(fieldName);
            f.setAccessible(true);
            return java.lang.reflect.Modifier.isStatic(f.getModifiers()) && f.getBoolean(null);
        } catch (Throwable t) {
            return false;
        }
    }

    /** 写入 TapComplianceInternal 的静态布尔状态 */
    private static void writeBool(String fieldName, boolean value) {
        try {
            Class<?> cls = Class.forName(PKG + ".compliance.internal.TapComplianceInternal");
            java.lang.reflect.Field f = cls.getDeclaredField(fieldName);
            f.setAccessible(true);
            if (java.lang.reflect.Modifier.isStatic(f.getModifiers())) f.setBoolean(null, value);
        } catch (Throwable ignore) { }
    }

    /** 玩家年龄段下限：-1 未知 / 0 / 8 / 16 / 18 */
    public static int getAgeRange() {
        return ageRange;
    }

    /**
     * 上次认证开始后 10 秒内没有任何回调 → 认为 SDK 内部 isRunning 卡死，
     * 用反射把它复位，否则「重新认证」会被 SDK 直接忽略。
     */
    private static void resetRunningIfStuck() {
        long now = System.currentTimeMillis();
        if (lastStartupAt > 0 && now - Math.max(lastStartupAt, lastCallbackAt) > 10000) {
            try {
                Class<?> cls = Class.forName(PKG + ".compliance.internal.TapComplianceInternal");
                java.lang.reflect.Field f = cls.getDeclaredField("isRunning");
                f.setAccessible(true);
                f.setBoolean(null, false);
                TapDiag.log("已重置卡死的认证标记");
            } catch (Throwable t) {
                TapDiag.log("重置认证标记失败：" + t);
            }
        }
    }

    /**
     * 诊断探针：直接调 SDK 的 ConfigApi 拉一次实名配置，把异常信息写进诊断日志；
     * 同时输出合规内部状态，用于判断卡在哪一步。
     */
    public static void probe() {
        try {
            Class<?> internal = Class.forName(PKG + ".compliance.internal.TapComplianceInternal");
            Object inst = internal.getField("INSTANCE").get(null);
            for (String name : new String[]{"isRunning", "clientId", "userId", "withUserAgeInfo", "canPlay"}) {
                try {
                    java.lang.reflect.Field f = internal.getDeclaredField(name);
                    f.setAccessible(true);
                    Object v = f.get(java.lang.reflect.Modifier.isStatic(f.getModifiers()) ? null : inst);
                    TapDiag.log("state." + name + "=" + v);
                } catch (Throwable ignore) { }
            }

            Class<?> cbCls = Class.forName("com.taptap.sdk.kit.internal.callback.TapTapCallback");
            Object proxy = Proxy.newProxyInstance(cbCls.getClassLoader(), new Class<?>[]{cbCls}, (p, m, a) -> {
                if ("onSuccess".equals(m.getName())) TapDiag.log("probe 配置成功");
                else if ("onFail".equals(m.getName())) TapDiag.log("probe 配置失败：" + exMessage(a));
                else if ("onCancel".equals(m.getName())) TapDiag.log("probe 配置取消");
                return null;
            });

            Class<?> apiCls = Class.forName(PKG + ".compliance.api.ConfigApi");
            Object api = apiCls.getField("INSTANCE").get(null);
            Method fetch = null;
            for (Method m : apiCls.getMethods()) {
                if ("fetchRealNameConfig".equals(m.getName()) && m.getParameterCount() == 1) { fetch = m; break; }
            }
            if (fetch == null) { TapDiag.log("probe：未找到 fetchRealNameConfig"); return; }
            fetch.invoke(api, proxy);
            TapDiag.log("probe 已发起");
            // 稍等一拍让请求/异常落地，再把本进程 logcat 里的 SDK 报错抓出来
            try { Thread.sleep(1500); } catch (InterruptedException ignore) { }
            TapDiag.dumpLogcat();
        } catch (Throwable t) {
            TapDiag.log("probe 异常：" + t);
        }
    }

    private static String exMessage(Object[] args) {
        if (args == null || args.length == 0 || args[0] == null) return "null";
        try {
            Object msg = args[0].getClass().getMethod("getMessage").invoke(args[0]);
            return String.valueOf(msg);
        } catch (Throwable t) {
            return String.valueOf(args[0]);
        }
    }

    private static int readAgeRange() {
        if (ageRangeMethod == null) return -1;
        try {
            Object v = ageRangeMethod.invoke(null);
            return v instanceof Number ? ((Number) v).intValue() : -1;
        } catch (Throwable t) {
            return -1;
        }
    }

    /** 退出账号时重置合规状态 */
    public static void exit() {
        if (exitMethod == null) return;
        try {
            exitMethod.invoke(null);
            lastResultCode = ComplianceCode.EXITED;
            ageRange = -1;
            Log.i(TAG, "已退出合规认证");
        } catch (Throwable t) {
            Log.w(TAG, "exit 调用失败: " + t.getMessage());
        }
    }

    /** 官方回调码 */
    public static final class ComplianceCode {
        public static final int LOGIN_SUCCESS = 500;
        public static final int EXITED = 1000;
        public static final int SWITCH_ACCOUNT = 1001;
        public static final int PERIOD_RESTRICT = 1030;
        public static final int DURATION_LIMIT = 1050;
        public static final int AGE_LIMIT = 1100;
        public static final int INVALID_CLIENT_OR_NETWORK_ERROR = 1200;
        public static final int REAL_NAME_STOP = 9002;

        private ComplianceCode() {}
    }

    public static String codeName(int code) {
        switch (code) {
            case ComplianceCode.LOGIN_SUCCESS: return "LOGIN_SUCCESS";
            case ComplianceCode.EXITED: return "EXITED";
            case ComplianceCode.SWITCH_ACCOUNT: return "SWITCH_ACCOUNT";
            case ComplianceCode.PERIOD_RESTRICT: return "PERIOD_RESTRICT";
            case ComplianceCode.DURATION_LIMIT: return "DURATION_LIMIT";
            case ComplianceCode.AGE_LIMIT: return "AGE_LIMIT";
            case ComplianceCode.INVALID_CLIENT_OR_NETWORK_ERROR: return "INVALID_CLIENT_OR_NETWORK_ERROR";
            case ComplianceCode.REAL_NAME_STOP: return "REAL_NAME_STOP";
            default: return "UNKNOWN";
        }
    }

    /** 是否允许进入游戏（500 通过；其余限制类都不允许） */
    public static boolean isAllowed(int code) {
        return code == ComplianceCode.LOGIN_SUCCESS;
    }

    /** 供日志/调试使用：返回当前回调附带信息（预留） */
    static String describeExtra(Map<String, ?> extra) {
        return extra == null ? "" : String.valueOf(extra);
    }
}
