package com.xianxia.sectgame;

import android.app.Activity;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

/**
 * Dirichlet 聚合 Ad SDK 的 Capacitor 插件封装（激励视频）。
 *
 * 设计策略：
 *  1. 调用真实的 Dirichlet 聚合 SDK（反射方式，避免 AAR 缺失时编译失败）；
 *  2. SDK 不可用、加载失败、超时时，直接返回「暂无广告」，不弹出虚拟广告。
 *
 * 真实 SDK 的调用流程（反射等价代码，包名 com.tapsdk.tapad.group）：
 * <pre>
 *   DirichletAdNative adNative = DirichletAdManager.get().createAdNative(activity);
 *   DirichletAdRequest request = new DirichletAdRequest.Builder()
 *       .withSpaceId(SPACE_ID)
 *       .withRewardName("灵石").withRewardAmount(500).withUserId("player")
 *       .build();
 *   adNative.loadRewardVideoAd(request, new RewardVideoAdListener() {
 *       public void onRewardVideoAdLoad(DirichletRewardVideoAd ad) {
 *           ad.setRewardAdInteractionListener(new RewardAdInteractionListener() {
 *               public void onAdShow() {}
 *               public void onRewardVerify(boolean isReward, ...) { rewarded = isReward; }
 *               public void onAdClick() {}
 *               public void onAdClose() { call.resolve(...); ad.destroy(); }
 *           });
 *           ad.showRewardVideoAd(activity);
 *       }
 *       public void onError(int code, String msg) { call.resolve(fail); }
 *   });
 * </pre>
 */
@CapacitorPlugin(name = "DirichletAd")
public class DirichletAd extends Plugin {
    public static final String TAG = "DirichletAd";

    // 聚合 SDK 真实包名前缀（从 AAR 反编译确认）
    private static final String PKG = "com.tapsdk.tapad.group";
    // 真实 SDK 加载超时（毫秒）：超时后直接返回暂无广告
    private static final long REAL_AD_LOAD_TIMEOUT_MS = 8000L;

    private PluginCall pendingCall;
    private boolean realSdkReady = false;   // SDK 是否可用（AAR 已打包且核心类可加载）
    private boolean adLoading = false;      // 是否正在加载中
    private Runnable timeoutRunnable = null; // 超时任务（用于取消）
    private android.os.Handler mainHandler;

    @Override
    public void load() {
        super.load();
        mainHandler = new android.os.Handler(android.os.Looper.getMainLooper());
        checkSdkReady();
    }

    private void cancelTimeout() {
        if (timeoutRunnable != null) {
            mainHandler.removeCallbacks(timeoutRunnable);
            timeoutRunnable = null;
        }
    }

    private void scheduleTimeout(@NonNull final Activity activity, @NonNull final PluginCall call,
                                 @NonNull final String stage) {
        cancelTimeout();
        timeoutRunnable = () -> {
            adLoading = false;
            Log.w(TAG, "真实 SDK " + stage + " 超时（>=" + (REAL_AD_LOAD_TIMEOUT_MS/1000) + "s）→ 返回暂无广告");
            call.resolve(makeResult(false, false, "暂无广告"));
        };
        mainHandler.postDelayed(timeoutRunnable, REAL_AD_LOAD_TIMEOUT_MS);
    }

    /**
     * 检测 Dirichlet 聚合 SDK 是否可用（核心类能否加载）。
     */
    private void checkSdkReady() {
        try {
            Class.forName(PKG + ".DirichletAdManager");
            Class.forName(PKG + ".DirichletAdNative");
            Class.forName(PKG + ".ads.DirichletRewardVideoAd");
            realSdkReady = true;
            Log.i(TAG, "Dirichlet 聚合 SDK 已就绪");
        } catch (ClassNotFoundException e) {
            realSdkReady = false;
            Log.w(TAG, "Dirichlet SDK 不可用，激励视频将返回暂无广告");
        }
    }

    /**
     * Capacitor 暴露方法：showRewardedVideo()
     * 前端调用：DirichletAd.showRewardedVideo() → Promise<{ rewarded: boolean }>
     */
    @PluginMethod
    public void showRewardedVideo(final PluginCall call) {
        // 广告功能暂时关闭
        Log.i(TAG, "showRewardedVideo: 广告功能已暂时关闭");
        call.resolve(makeResult(false, false, "广告功能暂未开放"));
    }

    // ===== 真实 SDK 调用 ============================================================

    /**
     * 加载激励视频广告，加载成功后立即展示。
     * 任何加载失败（同步异常、异步 onError、超时）都直接返回暂无广告。
     */
    private void loadAndShowRealAd(@NonNull final Activity activity, @NonNull final PluginCall call) {
        adLoading = true;
        // 启动加载超时：8 秒未回调则返回暂无广告
        scheduleTimeout(activity, call, "加载广告");
        try {
            Class<?> managerCls = Class.forName(PKG + ".DirichletAdManager");
            Class<?> adNativeCls = Class.forName(PKG + ".DirichletAdNative");
            Class<?> requestCls = Class.forName(PKG + ".DirichletAdRequest");
            Class<?> requestBuilderCls = Class.forName(PKG + ".DirichletAdRequest$Builder");
            Class<?> rewardVideoAdCls = Class.forName(PKG + ".ads.DirichletRewardVideoAd");
            Class<?> loadListenerCls = Class.forName(PKG + ".DirichletAdNative$RewardVideoAdListener");
            Class<?> interactionListenerCls = Class.forName(PKG + ".ads.DirichletRewardVideoAd$RewardAdInteractionListener");

            Log.d(TAG, "开始加载真实激励视频广告 spaceId=" + SectApp.REWARDED_VIDEO_SPACE_ID);

            // DirichletAdManager.get().createAdNative(activity)
            Object manager = managerCls.getMethod("get").invoke(null);
            Object adNative = managerCls.getMethod("createAdNative", android.content.Context.class)
                .invoke(manager, activity);

            // new DirichletAdRequest.Builder().withSpaceId(...).withRewardName(...).withRewardAmount(...).withUserId(...).build()
            Object builder = requestBuilderCls.newInstance();
            requestBuilderCls.getMethod("withSpaceId", long.class).invoke(builder, SectApp.REWARDED_VIDEO_SPACE_ID);
            requestBuilderCls.getMethod("withRewardName", String.class).invoke(builder, "灵石");
            requestBuilderCls.getMethod("withRewardAmount", int.class).invoke(builder, 500);
            requestBuilderCls.getMethod("withUserId", String.class).invoke(builder, "player");
            Object request = requestBuilderCls.getMethod("build").invoke(builder);

            // 加载回调监听器：Proxy 内层统一 try/catch，避免 SDK 多回调/未知方法导致崩溃
            final Class<?> fInteractionListenerCls = interactionListenerCls;
            final boolean[] loadSettled = {false}; // 防止 onError 与 onLoad 竞态后双重处理
            Object loadListener = Proxy.newProxyInstance(
                getClassLoader(),
                new Class[]{loadListenerCls},
                (proxy, method, args) -> {
                    String name = method.getName();
                    try {
                        if ("onRewardVideoAdLoad".equals(name) && args != null && args.length > 0) {
                            if (loadSettled[0]) return null;
                            loadSettled[0] = true;
                            cancelTimeout();
                            adLoading = false;
                            Log.i(TAG, "真实激励视频加载成功，开始展示");
                            showRealAd(activity, call, args[0], fInteractionListenerCls);
                        } else if ("onError".equals(name)) {
                            if (loadSettled[0]) return null;
                            loadSettled[0] = true;
                            cancelTimeout();
                            adLoading = false;
                            String reason = "";
                            if (args != null) {
                                if (args.length > 1) reason = args[0] + ", " + args[1];
                                else if (args.length > 0) reason = String.valueOf(args[0]);
                            }
                            Log.w(TAG, "真实激励视频加载 onError: " + reason + " → 返回暂无广告");
                            call.resolve(makeResult(false, false, "暂无广告"));
                        } else {
                            Log.v(TAG, "loadListener 未知方法: " + name);
                        }
                    } catch (Throwable inner) {
                        Log.e(TAG, "loadListener " + name + " 回调异常: " + inner.getMessage(), inner);
                    }
                    return null;
                }
            );

            // adNative.loadRewardVideoAd(request, loadListener)
            adNativeCls.getMethod("loadRewardVideoAd", requestCls, loadListenerCls)
                .invoke(adNative, request, loadListener);
        } catch (Throwable t) {
            cancelTimeout();
            adLoading = false;
            Log.w(TAG, "loadAndShowRealAd 同步异常: " + t.getMessage() + " → 返回暂无广告", t);
            call.resolve(makeResult(false, false, "暂无广告"));
        }
    }

    /**
     * 展示已加载的激励视频广告，并监听交互回调。
     */
    private void showRealAd(@NonNull final Activity activity, @NonNull final PluginCall call,
                            @NonNull final Object ad, @NonNull final Class<?> interactionListenerCls) {
        try {
            // 交互回调：onRewardVerify 时记为已发奖，onAdClose 时最终结算
            final boolean[] rewarded = {false};
            final boolean[] closed = {false};
            Object interactionListener = Proxy.newProxyInstance(
                getClassLoader(),
                new Class[]{interactionListenerCls},
                (proxy, method, args) -> {
                    String name = method.getName();
                    try {
                        switch (name) {
                            case "onAdShow":
                                Log.i(TAG, "真实激励视频曝光");
                                break;
                            case "onRewardVerify":
                                // onRewardVerify(boolean isReward, int amount, String name, int code, String msg)
                                if (args != null && args.length > 0 && Boolean.TRUE.equals(args[0])) {
                                    rewarded[0] = true;
                                    Log.i(TAG, "真实激励视频发放奖励回调");
                                }
                                break;
                            case "onAdClick":
                                Log.d(TAG, "真实激励视频点击");
                                break;
                            case "onAdClose":
                                if (closed[0]) return null;
                                closed[0] = true;
                                cancelTimeout();
                                Log.i(TAG, "真实激励视频关闭，rewarded=" + rewarded[0]);
                                try {
                                    ad.getClass().getMethod("destroy").invoke(ad);
                                } catch (Throwable ignore) { }
                                call.resolve(makeResult(rewarded[0], false, null));
                                break;
                            default:
                                Log.v(TAG, "interactionListener 未知方法: " + name);
                                break;
                        }
                    } catch (Throwable inner) {
                        Log.e(TAG, "interactionListener " + name + " 回调异常: " + inner.getMessage(), inner);
                        if ("onAdClose".equals(name) && !closed[0]) {
                            closed[0] = true;
                            call.resolve(makeResult(rewarded[0], false, "回调异常"));
                        }
                    }
                    return null;
                }
            );

            // ad.setRewardAdInteractionListener(listener)
            ad.getClass().getMethod("setRewardAdInteractionListener", interactionListenerCls)
                .invoke(ad, interactionListener);

            // ad.showRewardVideoAd(activity)
            ad.getClass().getMethod("showRewardVideoAd", android.app.Activity.class)
                .invoke(ad, activity);
            Log.d(TAG, "showRewardVideoAd 已调用");
        } catch (Throwable t) {
            cancelTimeout();
            Log.w(TAG, "showRealAd 异常: " + t.getMessage() + " → 返回暂无广告", t);
            try {
                ad.getClass().getMethod("destroy").invoke(ad);
            } catch (Throwable ignore) { }
            // 展示异常：直接返回暂无广告
            call.resolve(makeResult(false, false, "暂无广告"));
        }
    }

    // ===== 工具方法 =================================================================

    private ClassLoader getClassLoader() {
        return getContext() != null ? getContext().getClassLoader() :
            (getActivity() != null ? getActivity().getClassLoader() : DirichletAd.class.getClassLoader());
    }

    private static JSObject makeResult(boolean rewarded, boolean mock, String error) {
        JSObject ret = new JSObject();
        ret.put("rewarded", rewarded);
        ret.put("mock", mock);
        if (error != null) ret.put("error", error);
        return ret;
    }
}
