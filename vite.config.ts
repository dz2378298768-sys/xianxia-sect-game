/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  // 关键：Capacitor Android 使用 file:// 协议加载，必须用相对路径
  base: './',
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    // 兼容旧版 Android WebView（minSdkVersion=24，Android 7）。
    // 部分设备系统 WebView 未升级到 Chrome 61+，不支持原生 <script type="module">，
    // 会静默忽略脚本导致进游戏黑屏。此处额外生成 SystemJS + ES5 polyfill 包，
    // 并注入 <script nomodule> 回退脚本：旧 WebView 执行 nomodule，新 WebView 执行 module。
    // legacy({
    //   targets: ['Android >= 7', 'Chrome >= 53', 'defaults'],
    // }),
    tsconfigPaths()
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
  },
})
