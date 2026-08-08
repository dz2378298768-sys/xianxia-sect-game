package com.xianxia.sectgame;

import android.os.Bundle;
import android.os.CountDownTimer;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

/**
 * 真实 Dirichlet SDK 不可用时的「模拟激励视频」页面。
 * 展示 3 秒倒计时 + 进度条，结束后自动关闭并回调 rewarded=true，
 * 让整个「看广告->得灵石」流程在测试环境可完整跑通。
 */
public class MockAdActivity extends AppCompatActivity {
    public static final String EXTRA_DURATION_SEC = "DURATION_SEC";
    public static final int RESULT_CODE_REWARDED = 0x1234;
    public static final int RESULT_CODE_SKIPPED = 0x1235;

    private int durationSec = 3;
    private CountDownTimer timer;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        supportRequestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);
        getWindow().setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT);

        durationSec = Math.max(1, getIntent().getIntExtra(EXTRA_DURATION_SEC, 3));

        // 用代码直接构建 UI，避免 layout 文件缺失问题
        android.widget.LinearLayout root = new android.widget.LinearLayout(this);
        root.setOrientation(android.widget.LinearLayout.VERTICAL);
        root.setGravity(android.view.Gravity.CENTER);
        int pad = (int) (40 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad, pad, pad);
        root.setBackgroundColor(0xFF1A1A2E);

        TextView title = new TextView(this);
        title.setText("🎬 广告模拟播放中");
        title.setTextColor(0xFFE6C86A);
        title.setTextSize(24);
        title.setGravity(android.view.Gravity.CENTER);
        title.setPadding(0, 0, 0, pad);

        TextView sub = new TextView(this);
        sub.setText("（开发/测试环境：未接入真实 Dirichlet SDK，此处以模拟页替代）\n倒计时结束后将自动获得 500 灵石奖励");
        sub.setTextColor(0xFFCCCCCC);
        sub.setTextSize(14);
        sub.setGravity(android.view.Gravity.CENTER);
        sub.setPadding(0, 0, 0, pad);

        ProgressBar bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        bar.setIndeterminate(false);
        bar.setMax(durationSec);
        bar.setProgress(0);
        int barPad = (int) (20 * getResources().getDisplayMetrics().density);
        android.widget.LinearLayout.LayoutParams blp = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        blp.setMargins(0, 0, 0, barPad);
        bar.setLayoutParams(blp);

        final TextView countdown = new TextView(this);
        countdown.setText(durationSec + " 秒后可领取奖励");
        countdown.setTextColor(0xFF8FB8C4);
        countdown.setTextSize(16);
        countdown.setGravity(android.view.Gravity.CENTER);
        countdown.setPadding(0, 0, 0, pad);

        Button close = new Button(this);
        close.setText("跳过（无奖励）");
        close.setEnabled(false);
        close.setOnClickListener(v -> {
            if (timer != null) timer.cancel();
            setResult(RESULT_CODE_SKIPPED);
            finish();
        });

        root.addView(title);
        root.addView(sub);
        root.addView(bar);
        root.addView(countdown);
        root.addView(close);
        setContentView(root);

        final long TICK = 200;
        timer = new CountDownTimer(durationSec * 1000L, TICK) {
            @Override public void onTick(long millisUntilFinished) {
                int secLeft = (int) Math.ceil(millisUntilFinished / 1000.0);
                int progress = durationSec - secLeft;
                bar.setProgress(progress);
                countdown.setText(secLeft + " 秒后可领取奖励");
            }
            @Override public void onFinish() {
                bar.setProgress(durationSec);
                countdown.setText("✅ 奖励已达成，正在返回…");
                close.setText("领取 500 灵石");
                close.setEnabled(true);
                close.setOnClickListener(v -> {
                    setResult(RESULT_CODE_REWARDED);
                    finish();
                });
                // 自动关闭（0.6s 后）
                getWindow().getDecorView().postDelayed(() -> {
                    setResult(RESULT_CODE_REWARDED);
                    finish();
                }, 600);
            }
        };
        timer.start();
    }

    @Override
    public void onBackPressed() {
        // 禁用返回键（模拟激励视频不可退出）
        // 允许正常退出，但按 SKIP 处理避免刷奖励
        if (timer != null) timer.cancel();
        setResult(RESULT_CODE_SKIPPED);
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (timer != null) timer.cancel();
        super.onDestroy();
    }
}
