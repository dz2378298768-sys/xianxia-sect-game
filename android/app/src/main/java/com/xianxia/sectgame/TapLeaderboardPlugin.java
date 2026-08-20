package com.xianxia.sectgame;

import android.app.Activity;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.taptap.sdk.leaderboard.androidx.TapTapLeaderboard;
import com.taptap.sdk.leaderboard.data.request.SubmitScoresRequest;
import com.taptap.sdk.leaderboard.data.response.SubmitScoresResponse;
import com.taptap.sdk.leaderboard.callback.ITapTapLeaderboardResponseCallback;

import java.util.Collections;
import java.util.List;

/**
 * TapTap 排行榜 v4 SDK 的 Capacitor 插件封装。
 *
 * 使用 tap-leaderboard-androidx 提供的 TapTapLeaderboard 直接 API，
 * 不走反射，避免 SDK 内部类名大小写不匹配导致的 ClassNotFoundException。
 *
 * 依赖：implementation "com.taptap.sdk:tap-leaderboard-androidx:4.10.8"
 *
 * 前端调用：
 *   TapLeaderboard.open({ leaderboardId: string }) → Promise<{ success: boolean, error?: string }>
 *   TapLeaderboard.putScore({ leaderboardId: string, score: number }) → Promise<{ success: boolean, error?: string }>
 */
@CapacitorPlugin(name = "TapLeaderboard")
public class TapLeaderboardPlugin extends Plugin {

    private static final String TAG = "TapLeaderboardPlugin";

    // ===== Capacitor 方法 =====================================================

    /**
     * 打开排行榜 UI。
     * 前端调用：TapLeaderboard.open({ leaderboardId: string }) → Promise<{ success: boolean }>
     */
    @PluginMethod
    public void open(final PluginCall call) {
        String leaderboardId = call.getString("leaderboardId");
        if (leaderboardId == null || leaderboardId.isEmpty()) {
            call.resolve(makeResult(false, "leaderboardId 不能为空"));
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.resolve(makeResult(false, "activity is null"));
            return;
        }

        try {
            // TapTapLeaderboard.openLeaderboard(activity, leaderboardId, collection)
            // collection 可选值：LeaderboardCollection.PUBLIC / FRIENDS
            TapTapLeaderboard.openLeaderboard(activity, leaderboardId, "public");
            Log.i(TAG, "openLeaderboard 成功: " + leaderboardId);
            call.resolve(makeResult(true, null));
        } catch (Throwable t) {
            Log.e(TAG, "openLeaderboard 异常: " + t.getMessage(), t);
            call.resolve(makeResult(false, "打开排行榜失败: " + t.getMessage()));
        }
    }

    /**
     * 提交成绩到排行榜。
     * 前端调用：TapLeaderboard.putScore({ leaderboardId: string, score: number }) → Promise<{ success: boolean }>
     */
    @PluginMethod
    public void putScore(final PluginCall call) {
        String leaderboardId = call.getString("leaderboardId");
        if (leaderboardId == null || leaderboardId.isEmpty()) {
            call.resolve(makeResult(false, "leaderboardId 不能为空"));
            return;
        }

        Double scoreVal = call.getDouble("score");
        if (scoreVal == null) {
            call.resolve(makeResult(false, "score 不能为空"));
            return;
        }

        try {
            // 创建 ScoreItem
            SubmitScoresRequest.ScoreItem scoreItem =
                new SubmitScoresRequest.ScoreItem(leaderboardId, scoreVal.longValue());
            List<SubmitScoresRequest.ScoreItem> items = Collections.singletonList(scoreItem);

            // 提交成绩
            TapTapLeaderboard.submitScores(items, new ITapTapLeaderboardResponseCallback<SubmitScoresResponse>() {
                @Override
                public void onSuccess(SubmitScoresResponse response) {
                    Log.i(TAG, "putScore 成功: " + leaderboardId + " score=" + scoreVal);
                    call.resolve(makeResult(true, null));
                }

                @Override
                public void onFailure(int code, String message) {
                    Log.w(TAG, "putScore 失败: code=" + code + " msg=" + message);
                    call.resolve(makeResult(false, message));
                }
            });
        } catch (Throwable t) {
            Log.e(TAG, "putScore 异常: " + t.getMessage(), t);
            call.resolve(makeResult(false, "提交成绩失败: " + t.getMessage()));
        }
    }

    // ===== 工具方法 ===========================================================

    private static JSObject makeResult(boolean success, String error) {
        JSObject ret = new JSObject();
        ret.put("success", success);
        if (error != null) ret.put("error", error);
        return ret;
    }
}