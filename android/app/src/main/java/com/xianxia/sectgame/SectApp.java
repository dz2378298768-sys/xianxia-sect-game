package com.xianxia.sectgame;

import android.app.Application;
import android.util.Log;

import java.lang.reflect.Method;

/**
 * 应用级 Application 类。
 *
 * 职责：
 *  1. 初始化 Dirichlet 聚合 Ad SDK（激励视频）。
 *  2. 初始化 TapTap 更新唤起 SDK v4（强更检测）。
 *
 * 说明：所有 SDK 初始化均采用反射方式调用，缺库时自动安全降级，不影响游戏启动。
 */
public class SectApp extends Application {
    public static final String TAG = "SectApp";

    // === Dirichlet ADN 平台申请到的参数（已预填） =========================================
    // 媒体 ID（SDK 要求 long 类型）
    public static final long MEDIA_ID = 1105815L;
    // 媒体名称
    public static final String MEDIA_NAME = "修仙宗门管理";
    // 媒体密钥
    public static final String MEDIA_KEY = "JGNuQWaJ3FfKRcDINRkyiFWxooiDrFcEdOb84h4XXKU5rJ2lOtmMZjMQTtLnMCYK";
    // 激励视频广告位 ID（SDK 要求 long 类型）
    public static final long REWARDED_VIDEO_SPACE_ID = 1061172L;
    // =====================================================================================

    // === TapTap 更新唤起 SDK v4 参数（已填入 TapTap 开发者中心真实值） =================
    // 控制台：https://developer.taptap.cn/ → 游戏服务 → 服务概述 → 查看应用详情
    public static final String TAP_CLIENT_ID = "gjxwmq186e8zse9wno";
    public static final String TAP_CLIENT_TOKEN = "npZkPaoj9xlpk1oil23SWAYq3IVIESZSvnVx9QFz";
    // 应用包名（与 AndroidManifest、TapTap 开发者中心一致）
    public static final String TAP_APP_PACKAGE = "com.xianxia.sectgame";
    // =====================================================================================

    // 聚合 SDK 真实包名前缀（从 AAR 反编译确认）
    private static final String PKG = "com.tapsdk.tapad.group";
    // TapSDK v4 包名前缀（tap-core / tap-update）
    private static final String TAP_PKG = "com.taptap.sdk";

    // TapTap 更新 SDK 是否就绪（类加载成功）
    public static boolean tapUpdateSdkReady = false;

    @Override
    public void onCreate() {
        super.onCreate();

        // 1. 初始化 Dirichlet 聚合 Ad SDK（反射方式，AAR 缺失时不影响应用启动）
        initDirichletSdk();

        // 2. 初始化 TapTap 更新唤起 SDK v4（反射方式，Maven 依赖缺失时安全降级）
        initTapUpdateSdk();
    }

    /**
     * 初始化 Dirichlet 聚合 Ad SDK。
     */
    private void initDirichletSdk() {
        try {
            Class<?> configCls = Class.forName(PKG + ".DirichletAdConfig");
            Class<?> builderCls = Class.forName(PKG + ".DirichletAdConfig$Builder");
            Class<?> managerCls = Class.forName(PKG + ".DirichletAdManager");

            // 构造 config
            Object builder = builderCls.newInstance();
            builderCls.getMethod("withMediaId", long.class).invoke(builder, MEDIA_ID);
            builderCls.getMethod("withMediaName", String.class).invoke(builder, MEDIA_NAME);
            builderCls.getMethod("withMediaKey", String.class).invoke(builder, MEDIA_KEY);
            builderCls.getMethod("enableDebug", boolean.class).invoke(builder, false);
            Object config = builderCls.getMethod("build").invoke(builder);

            // 获取单例 manager：DirichletAdManager.get()
            Object manager = managerCls.getMethod("get").invoke(null);

            // 调用 init(context, config)
            Method initMethod = managerCls.getMethod("init", android.content.Context.class, configCls);
            initMethod.invoke(manager, this, config);

            // 请求必要权限（READ_PHONE_STATE / 位置等，提升填充率）
            try {
                Method reqPerm = managerCls.getMethod("requestPermissionIfNecessary", android.content.Context.class);
                reqPerm.invoke(manager, this);
            } catch (Throwable ignore) { }

            Log.i(TAG, "Dirichlet 聚合 SDK init 已调用");
        } catch (ClassNotFoundException e) {
            Log.w(TAG, "Dirichlet SDK 类未找到，激励视频功能将不可用。请确认 DirichletAD_*.aar 已放入 app/src/main/libs/");
        } catch (Throwable t) {
            Log.w(TAG, "Dirichlet SDK 初始化异常: " + t.getMessage());
        }
    }

    /**
     * 初始化 TapTap 更新唤起 SDK v4（开发者中心配置更新模式）。
     *
     * 真实调用等价于（SDK v4 原生 Java 示例）：
     * <pre>
     *   TapConfig config = new TapConfig.Builder()
     *       .withAppContext(this)
     *       .withClientId(TAP_CLIENT_ID)
     *       .withClientToken(TAP_CLIENT_TOKEN)
     *       .withRegion(TapConfig.REGION_CN)
     *       .build();
     *   TapSDK.init(config);
     * </pre>
     *
     * 如果使用 v4 更新模块单独初始化的实现（TapTapUpdate.init 或独立 Builder），
     * 则在此基础上反射继续调用 CheckForceUpdate（由 MainActivity 延迟触发）。
     */
    private void initTapUpdateSdk() {
        try {
            // 优先尝试 TapSDK 核心统一初始化（v4 推荐流程）
            Class<?> configCls = Class.forName(TAP_PKG + ".core.TapConfig");
            Class<?> builderCls = Class.forName(TAP_PKG + ".core.TapConfig$Builder");
            Class<?> sdkCls = Class.forName(TAP_PKG + ".core.TapSDK");
            Class<?> regionEnumCls = Class.forName(TAP_PKG + ".core.TapConfig$Region");

            Object builder = builderCls.newInstance();
            builderCls.getMethod("withAppContext", android.content.Context.class).invoke(builder, this);
            builderCls.getMethod("withClientId", String.class).invoke(builder, TAP_CLIENT_ID);
            builderCls.getMethod("withClientToken", String.class).invoke(builder, TAP_CLIENT_TOKEN);
            // REGION_CN 是枚举值，反射获取常量字段
            Object regionCn = regionEnumCls.getField("REGION_CN").get(null);
            builderCls.getMethod("withRegion", regionEnumCls).invoke(builder, regionCn);
            Object config = builderCls.getMethod("build").invoke(builder);

            sdkCls.getMethod("init", configCls).invoke(null, config);
            tapUpdateSdkReady = true;
            Log.i(TAG, "TapTap SDK 已初始化（ClientId=" + TAP_CLIENT_ID + "），更新唤起模块可用");
            return;
        } catch (ClassNotFoundException ignored) {
            // v4 核心包不存在或包名不同，尝试 update 模块的独立初始化
        } catch (Throwable t) {
            Log.w(TAG, "TapTap SDK 核心初始化失败（尝试降级更新模块独立初始化）: " + t.getMessage());
        }

        // 降级：尝试更新模块独立初始化（部分 v4.9.x 之前版本）
        try {
            Class<?> updateCls = Class.forName(TAP_PKG + ".update.TapTapUpdate");
            try {
                // init(Context, String clientId, String clientToken)
                updateCls.getMethod("init", android.content.Context.class, String.class, String.class)
                    .invoke(null, this, TAP_CLIENT_ID, TAP_CLIENT_TOKEN);
                tapUpdateSdkReady = true;
                Log.i(TAG, "TapTap 更新 SDK 独立初始化成功");
                return;
            } catch (NoSuchMethodException ignored2) { }

            try {
                // init(Context, String clientId, String clientToken, boolean isCn)
                updateCls.getMethod("init", android.content.Context.class, String.class, String.class, boolean.class)
                    .invoke(null, this, TAP_CLIENT_ID, TAP_CLIENT_TOKEN, true);
                tapUpdateSdkReady = true;
                Log.i(TAG, "TapTap 更新 SDK 独立初始化（四参数重载）成功");
                return;
            } catch (NoSuchMethodException ignored3) { }

            Log.w(TAG, "TapTap 更新 SDK 初始化方法签名不匹配，已跳过");
        } catch (ClassNotFoundException e) {
            Log.w(TAG, "TapTap 更新 SDK 未找到（未引入 tap-update 依赖？），更新唤起功能不可用。"
                + " 请确认 build.gradle 中 TAP_UPDATE_ENABLED=true 并联网拉取依赖。");
        } catch (Throwable t) {
            Log.w(TAG, "TapTap 更新 SDK 初始化异常: " + t.getMessage());
        }
    }
}
