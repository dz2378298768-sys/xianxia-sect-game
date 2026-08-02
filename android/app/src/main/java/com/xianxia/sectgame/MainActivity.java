package com.xianxia.sectgame;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * 沉浸式全屏：游戏启动后隐藏 Android 系统状态栏与虚拟导航栏，
 * 使用 IMMERSIVE_STICKY（从屏幕边缘滑动会临时浮现，几秒后自动再次隐藏）。
 *
 * 参考经验：优先用 WindowInsetsControllerCompat + setDecorFitsSystemWindows(false)，
 * 而非过时的 SYSTEM_UI_FLAG_* 位掩码，同时覆盖 onWindowFocusChanged/onResume
 * 确保切屏/锁屏回来后依然保持沉浸式。
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

        // 4. 启用沉浸式
        applyImmersiveSticky();
    }

    @Override
    public void onResume() {
        super.onResume();
        // 从后台回来/锁屏回来 重新应用沉浸式
        applyImmersiveSticky();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            // 焦点回来时再次应用，避免退出多任务再回来显示了导航栏
            applyImmersiveSticky();
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
