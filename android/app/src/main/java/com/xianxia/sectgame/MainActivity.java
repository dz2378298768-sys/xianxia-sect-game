package com.xianxia.sectgame;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * 沉浸式全屏：游戏启动后隐藏 Android 系统状态栏与虚拟导航栏，
 * 使用 IMMERSIVE_STICKY（从屏幕边缘滑动会临时浮现，几秒后自动再次隐藏）。
 *
 * 另外针对真机（特别是旧版 Android System WebView）：
 *  - 显式开启 WebView 的 file 访问、content 访问允许；
 *  - 允许混合内容（真机上 file:// 加载 resources 偶尔被归类为 mixed）；
 *  - 允许本地文件访问 file:///android_asset/。
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 1. 在 super.onCreate 之前请求无标题 feature（配合主题使用）
        supportRequestWindowFeature(Window.FEATURE_NO_TITLE);
        // 注册原生广告插件（激励视频）
        registerPlugin(DirichletAd.class);
        // 注册 TapTap 更新唤起插件
        registerPlugin(TapUpdate.class);
        // 注册 TapTap 登录插件
        registerPlugin(TapLoginPlugin.class);
        // 注册 TapTap 排行榜插件
        registerPlugin(TapLeaderboardPlugin.class);
        super.onCreate(savedInstanceState);

        // 2. Window 层面：关闭 decorFitsSystemWindows，让内容延伸到系统栏后面
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // 3. 状态栏 & 导航栏设为透明，保证沉浸式时露出的是游戏画面
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(0x00000000);
            window.setNavigationBarColor(0x00000000);
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        }

        // 4. WebView 显式开启本地资源访问（真机上 file:// 加载 catalog-*.jpg 的关键）
        ensureWebViewFileAccess();

        // 5. 启用沉浸式
        applyImmersiveSticky();

        // 6. 自动触发 TapTap 强更检测（开发者中心配置模式）
        //    延迟 1.5 秒执行：避免 onCreate 动画期间叠加系统更新弹窗造成卡顿；
        //    TapTap SDK 如果检测到有强更版本，会自动弹出 UI 并跳转 TapTap 商店更新页。
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(this::autoCheckForceUpdate, 1500);
    }

    /**
     * 调用 TapUpdate 插件执行强更检测（开发者中心配置模式）。
     * 通过反射调用插件内部 checkForceUpdate 逻辑，不依赖 Capacitor bridge。
     */
    private void autoCheckForceUpdate() {
        try {
            if (!SectApp.tapUpdateSdkReady) {
                android.util.Log.d("MainActivity", "autoCheckForceUpdate: SDK 未就绪，跳过");
                return;
            }
            if (SectApp.TAP_CLIENT_ID.contains("PLACEHOLDER") || SectApp.TAP_CLIENT_TOKEN.contains("PLACEHOLDER")) {
                android.util.Log.d("MainActivity", "autoCheckForceUpdate: 占位符未替换，跳过");
                return;
            }
            // 直接复用 TapUpdate 的静态逻辑？我们在插件里封装好了，也可以 new 一个临时对象反射调 checkForceUpdate
            // 更直接：用反射调用 static 的 find+invoke 逻辑，省得 new Plugin 实例
            try {
                Class<?> updateCls = Class.forName("com.taptap.sdk.update.TapTapUpdate");
                for (String n : new String[]{"CheckForceUpdate","checkForceUpdate","checkUpdate","CheckUpdate"}) {
                    try {
                        java.lang.reflect.Method m = updateCls.getMethod(n, Activity.class);
                        m.invoke(null, this);
                        android.util.Log.i("MainActivity", "autoCheckForceUpdate: 已调用 SDK." + n);
                        return;
                    } catch (NoSuchMethodException ignored) { }
                }
                android.util.Log.w("MainActivity", "autoCheckForceUpdate: 未找到匹配的方法签名");
            } catch (ClassNotFoundException ignored) {
                android.util.Log.w("MainActivity", "autoCheckForceUpdate: TapTapUpdate 类不存在（SDK 未引入）");
            } catch (Throwable t) {
                android.util.Log.w("MainActivity", "autoCheckForceUpdate 异常: " + t.getMessage());
            }
        } catch (Throwable ignore) {
            // 任意异常忽略，不影响游戏启动流程
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // 从后台回来/锁屏回来 重新应用沉浸式
        applyImmersiveSticky();
        // 某些机型在后台 kill 后重新 attach webview，再次确保设置到位
        ensureWebViewFileAccess();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            // 焦点回来时再次应用，避免退出多任务再回来显示了导航栏
            applyImmersiveSticky();
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void ensureWebViewFileAccess() {
        try {
            if (bridge == null) return;
            WebView webView = bridge.getWebView();
            if (webView == null) return;
            WebSettings s = webView.getSettings();
            // 允许 file:// 方案访问（Capacitor 加载 index.html 用的是 file:///android_asset/public/）
            s.setAllowFileAccess(true);
            // 允许通过 content:// URI 访问（部分机型 asset 走 content provider）
            s.setAllowContentAccess(true);
            // 允许 file:// 上下文加载其它本地资源
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                s.setAllowFileAccessFromFileURLs(true);
                s.setAllowUniversalAccessFromFileURLs(true);
            }
            // 混合内容：file:// 加载 http(s) 降级场景放行（我们都是本地，但放一道保险）
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
            }
            // 缓存模式：本地资源不从网络拉取；正常默认，但显式指定避免某些机型"无网络就不加载"
            s.setCacheMode(WebSettings.LOAD_DEFAULT);
            // 图片自动加载
            s.setLoadsImagesAutomatically(true);
            s.setBlockNetworkImage(false);
            s.setBlockNetworkLoads(false);
        } catch (Throwable ignored) {
            // 任一设置抛异常不影响游戏启动
        }
    }

    private void applyImmersiveSticky() {
        Window window = getWindow();
        if (window == null) return;
        View decorView = window.getDecorView();
        if (decorView == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ 推荐：WindowInsetsController
            WindowInsetsController controller = decorView.getWindowInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.systemBars());
                controller.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
        } else {
            // Android 10 及以下：WindowInsetsControllerCompat 需要从 WindowCompat 获取
            WindowInsetsControllerCompat compat =
                WindowCompat.getInsetsController(window, decorView);
            if (compat != null) {
                compat.hide(WindowInsetsCompat.Type.systemBars());
                compat.setSystemBarsBehavior(
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
        }
    }
}
