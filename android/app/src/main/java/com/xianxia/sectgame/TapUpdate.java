package com.xianxia.sectgame;

import android.app.Activity;
import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

/**
 * TapTap 更新唤起 SDK v4 的 Capacitor 插件封装。
 *
 * 设计策略（同广告 SDK）：
 *  1. 优先通过反射调用真实 TapSDK v4（tap-core + tap-update Maven 依赖）；
 *  2. SDK 不可用 / 占位符未替换 / 初始化失败时，直接 resolve 提示信息，不崩游戏。
 *
 * 真实 SDK Java 调用等价于（开发者中心配置更新模式）：
 * <pre>
 *   // 模式一：开发者中心后台配置了新版本强更时，调用此方法自动唤起 TapTap 商店更新页
 *   TapTapUpdate.CheckForceUpdate(activity);
 *
 *   // 模式二：游戏自行判断有新版本时，调用此方法唤起 TapTap 商店更新页
 *   TapTapUpdate.UpdateGame(activity, () -> {
 *       // 用户点击「取消」时的回调
 *   });
 * </pre>
 *
 * 文档参考：
 *  - 功能介绍：https://developer.taptap.cn/docs/sdk/update/features/
 *  - 开发指南：https://developer.taptap.cn/docs/sdk/update/guide/
 *  - 常见问题：https://developer.taptap.cn/docs/sdk/update/faq/
 */
@CapacitorPlugin(name = "TapUpdate")
public class TapUpdate extends Plugin {
    private static final String TAG = "TapUpdate";
    private static final String TAP_PKG = "com.taptap.sdk";

    // 包名 / 方法签名尝试顺序（不同 v4.x 子版本略有差异，逐一兜底）
    private static final String[] UPDATE_CLASS_CANDIDATES = {
        TAP_PKG + ".update.TapTapUpdate",
        TAP_PKG + ".TapTapUpdate",
        TAP_PKG + ".core.update.TapTapUpdate",
    };
    private static final String[] CHECK_METHOD_CANDIDATES = {
        "CheckForceUpdate", "checkForceUpdate", "checkUpdate", "CheckUpdate"
    };
    private static final String[] UPDATE_GAME_METHOD_CANDIDATES = {
        "UpdateGame", "updateGame"
    };

    private Class<?> updateCls;      // 已解析的更新实现类
    private Method checkMethod;      // 已解析的强更方法
    private Method updateGameMethod; // 已解析的自定义更新方法（带取消回调）
    private boolean resolved = false;

    /**
     * 尝试根据类名候选和方法名候选解析出可用的更新 API。
     * 缓存成功解析的结果，避免每次调用都 Class.forName。
     */
    private synchronized void resolve() {
        if (resolved) return;
        resolved = true;
        if (!SectApp.tapUpdateSdkReady) {
            Log.w(TAG, "resolve: SectApp 标记 SDK 未就绪，跳过");
            return;
        }

        for (String clsName : UPDATE_CLASS_CANDIDATES) {
            try {
                Class<?> cls = Class.forName(clsName);
                Method mCheck = findFirstStaticMethod(cls, CHECK_METHOD_CANDIDATES,
                    new Class<?>[] { Activity.class });
                Method mUpdate = findFirstStaticMethodWithRunnable(cls, UPDATE_GAME_METHOD_CANDIDATES);
                if (mCheck != null || mUpdate != null) {
                    updateCls = cls;
                    checkMethod = mCheck;
                    updateGameMethod = mUpdate;
                    Log.i(TAG, "resolve 成功: class=" + clsName
                        + (mCheck != null ? ", " + mCheck.getName() : "")
                        + (mUpdate != null ? ", " + mUpdate.getName() : ""));
                    return;
                }
            } catch (ClassNotFoundException ignored) {
                // 继续下一个候选
            } catch (Throwable t) {
                Log.w(TAG, "resolve 候选 " + clsName + " 异常: " + t.getMessage());
            }
        }
        Log.w(TAG, "resolve 未找到可用的 TapTapUpdate API（可能 SDK 版本与候选签名不匹配）");
    }

    private static Method findFirstStaticMethod(Class<?> cls, String[] names, Class<?>[] params) {
        for (String n : names) {
            try {
                Method m = cls.getMethod(n, params);
                m.setAccessible(true);
                return m;
            } catch (NoSuchMethodException ignored) { }
        }
        return null;
    }

    /**
     * 找形如 static foo(Activity, Runnable/Consumer<Unit>/Object callback) 这样的方法：
     * v4.10.x Unity 文档 Unity 写法是：TapTapUpdate.UpdateGame(() => { ... });
     * Java 端一般对应 static void UpdateGame(Activity activity, final Runnable onCancel)。
     * 为了兼容多种签名，这里尝试 (Activity, Runnable) / (Activity, Object) 两版。
     */
    private static Method findFirstStaticMethodWithRunnable(Class<?> cls, String[] names) {
        for (String n : names) {
            try {
                Method m = cls.getMethod(n, Activity.class, Runnable.class);
                m.setAccessible(true);
                return m;
            } catch (NoSuchMethodException ignored) { }
            try {
                Method m = cls.getMethod(n, Activity.class, Object.class);
                m.setAccessible(true);
                return m;
            } catch (NoSuchMethodException ignored) { }
        }
        return null;
    }

    // ===== Capacitor 暴露方法 ===========================================================

    /**
     * 模式一：开发者中心配置更新（推荐）
     * 前端调用：TapUpdate.checkForceUpdate() → Promise<{ triggered:boolean, error?:string }>
     *
     * 若 TapTap 后台有设置强制更新版本，SDK 会自动唤起 TapTap 商店更新页；
     * 若无更新 / SDK 不可用 / 无 TapTap 客户端，则 resolve 对应状态。
     */
    @PluginMethod
    public void checkForceUpdate(final PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.resolve(makeResult(false, "activity is null"));
            return;
        }
        resolve();

        // 前置校验：ClientId / ClientToken 还是占位符
        if (SectApp.TAP_CLIENT_ID.contains("PLACEHOLDER") || SectApp.TAP_CLIENT_TOKEN.contains("PLACEHOLDER")) {
            Log.w(TAG, "checkForceUpdate: ClientId/ClientToken 仍是占位符，跳过");
            call.resolve(makeResult(false, "请先在 SectApp.java 中配置 TapTap Client ID 与 Client Token"));
            return;
        }
        if (updateCls == null || checkMethod == null) {
            Log.w(TAG, "checkForceUpdate: 未找到 SDK API，跳过");
            call.resolve(makeResult(false, "当前环境不支持 TapTap 更新唤起功能（SDK 未引入或版本不匹配）"));
            return;
        }

        try {
            checkMethod.invoke(null, activity);
            Log.i(TAG, "checkForceUpdate: 已调用 SDK CheckForceUpdate");
            call.resolve(makeResult(true, null));
        } catch (Throwable t) {
            Log.w(TAG, "checkForceUpdate 调用异常: " + t.getMessage(), t);
            call.resolve(makeResult(false, "唤起更新失败: " + t.getMessage()));
        }
    }

    /**
     * 模式二：游戏自行判断更新
     * 前端调用：TapUpdate.updateGame() → Promise<{ triggered:boolean, error?:string, cancelled?:boolean }>
     *
     * 游戏自己的版本接口判断有新版本时调用此接口，唤起 TapTap 商店更新页。
     * 若用户点击了「取消」按钮，则 Promise.resolve 中 cancelled=true。
     */
    @PluginMethod
    public void updateGame(final PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.resolve(makeUpdateGameResult(false, "activity is null", false));
            return;
        }
        resolve();

        if (SectApp.TAP_CLIENT_ID.contains("PLACEHOLDER") || SectApp.TAP_CLIENT_TOKEN.contains("PLACEHOLDER")) {
            Log.w(TAG, "updateGame: ClientId/ClientToken 仍是占位符，跳过");
            call.resolve(makeUpdateGameResult(false,
                "请先在 SectApp.java 中配置 TapTap Client ID 与 Client Token", false));
            return;
        }
        if (updateCls == null || updateGameMethod == null) {
            // 没有 UpdateGame 方法时，尝试退回 CheckForceUpdate 兜底
            if (checkMethod != null) {
                try {
                    checkMethod.invoke(null, activity);
                    call.resolve(makeUpdateGameResult(true, null, false));
                } catch (Throwable t) {
                    call.resolve(makeUpdateGameResult(false,
                        "当前环境不支持 TapTap 更新唤起功能（SDK 未引入或版本不匹配）", false));
                }
                return;
            }
            Log.w(TAG, "updateGame: 未找到 SDK API，跳过");
            call.resolve(makeUpdateGameResult(false,
                "当前环境不支持 TapTap 更新唤起功能（SDK 未引入或版本不匹配）", false));
            return;
        }

        try {
            // 封装取消回调为 Runnable / Object
            Class<?>[] pTypes = updateGameMethod.getParameterTypes();
            Object cb;
            final boolean[] promiseSettled = { false };
            final java.util.concurrent.atomic.AtomicReference<PluginCall> callRef =
                new java.util.concurrent.atomic.AtomicReference<>(call);
            if (pTypes[1].isAssignableFrom(Runnable.class)) {
                cb = (Runnable) () -> {
                    Log.i(TAG, "updateGame: 用户点击取消");
                    if (promiseSettled[0]) return;
                    promiseSettled[0] = true;
                    PluginCall c = callRef.get();
                    if (c != null && getActivity() != null) {
                        getActivity().runOnUiThread(() ->
                            c.resolve(makeUpdateGameResult(true, null, true)));
                    }
                };
            } else {
                // 其它情况：用动态代理，避免 SDK 回调抛异常
                cb = Proxy.newProxyInstance(
                    TapUpdate.class.getClassLoader(),
                    new Class<?>[] { pTypes[1] },
                    (proxy, method, args) -> {
                        Log.i(TAG, "updateGame: 用户取消回调触发 (method=" + method.getName() + ")");
                        if (promiseSettled[0]) return null;
                        promiseSettled[0] = true;
                        PluginCall c = callRef.get();
                        if (c != null && getActivity() != null) {
                            getActivity().runOnUiThread(() ->
                                c.resolve(makeUpdateGameResult(true, null, true)));
                        }
                        return null;
                    }
                );
            }
            updateGameMethod.invoke(null, activity, cb);
            Log.i(TAG, "updateGame: 已调用 SDK UpdateGame");
            // 正常情况下无需立即 resolve（取消时 / 页面关闭时 SDK 回调会处理）
            // 为避免 Promise 挂起：8 秒仍无回调则直接解（UI 上没有等待态也没关系）
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                try {
                    if (!promiseSettled[0]) {
                        promiseSettled[0] = true;
                        PluginCall c = callRef.get();
                        if (c != null) c.resolve(makeUpdateGameResult(true, null, false));
                    }
                } catch (Throwable ignore) { }
            }, 8000);
        } catch (Throwable t) {
            Log.w(TAG, "updateGame 调用异常: " + t.getMessage(), t);
            call.resolve(makeUpdateGameResult(false, "唤起更新失败: " + t.getMessage(), false));
        }
    }

    // ===== 工具方法 =====================================================================

    private static JSObject makeResult(boolean triggered, String error) {
        JSObject obj = new JSObject();
        obj.put("triggered", triggered);
        obj.put("sdkReady", SectApp.tapUpdateSdkReady);
        if (error != null) obj.put("error", error);
        return obj;
    }

    private static JSObject makeUpdateGameResult(boolean triggered, String error, boolean cancelled) {
        JSObject obj = makeResult(triggered, error);
        obj.put("cancelled", cancelled);
        return obj;
    }
}
