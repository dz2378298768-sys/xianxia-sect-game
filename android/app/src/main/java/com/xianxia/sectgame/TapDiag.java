package com.xianxia.sectgame;

import android.util.Log;

import java.text.SimpleDateFormat;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Date;
import java.util.Deque;
import java.util.List;
import java.util.Locale;

/**
 * 轻量诊断日志。
 *
 * 目的：真机没有 adb 时，把「TapTap 登录 / 合规认证」的关键步骤留在内存里，
 * 由前端通过 TapLogin.getDiag() 取出来显示在准入页，方便定位认证卡住的原因。
 */
public final class TapDiag {

    private static final String TAG = "TapDiag";
    private static final int MAX_LINES = 30;
    private static final Deque<String> LINES = new ArrayDeque<>();
    private static final SimpleDateFormat TIME = new SimpleDateFormat("HH:mm:ss", Locale.CHINA);

    private TapDiag() {}

    public static synchronized void log(String msg) {
        String line = TIME.format(new Date()) + " " + msg;
        Log.i(TAG, msg);
        LINES.addLast(line);
        while (LINES.size() > MAX_LINES) LINES.removeFirst();
    }

    /** 最近若干条日志（按时间顺序） */
    public static synchronized List<String> tail(int count) {
        List<String> all = new ArrayList<>(LINES);
        int from = Math.max(0, all.size() - count);
        return new ArrayList<>(all.subList(from, all.size()));
    }

    public static synchronized void clear() {
        LINES.clear();
    }

    /**
     * 把本进程 logcat 里与 TapTap / 合规相关的行抓进诊断日志。
     * 用于真机无 adb 时看清 SDK 内部到底报了什么错（只能读到本应用自己的日志）。
     */
    public static void dumpLogcat() {
        try {
            Process p = Runtime.getRuntime().exec(new String[]{"logcat", "-d", "-t", "500"});
            java.io.BufferedReader reader = new java.io.BufferedReader(
                new java.io.InputStreamReader(p.getInputStream()));
            List<String> hits = new ArrayList<>();
            String line;
            while ((line = reader.readLine()) != null) {
                String low = line.toLowerCase(Locale.ROOT);
                if (line.contains("TapDiag")) continue;
                if (low.contains("compliance") || low.contains("taptap")) hits.add(line);
            }
            reader.close();
            int from = Math.max(0, hits.size() - 8);
            for (String h : hits.subList(from, hits.size())) {
                log("LC " + h.substring(Math.max(0, h.length() - 150)));
            }
            if (hits.isEmpty()) log("LC 无相关日志");
        } catch (Throwable t) {
            log("logcat 读取失败：" + t);
        }
    }
}
