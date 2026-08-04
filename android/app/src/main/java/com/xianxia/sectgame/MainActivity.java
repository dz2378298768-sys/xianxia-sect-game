package com.xianxia.sectgame;

import android.annotation.SuppressLint;
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
