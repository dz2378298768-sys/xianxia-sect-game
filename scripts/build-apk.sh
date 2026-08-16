#!/usr/bin/env bash
# =====================================================================
# 修仙宗门管理 —— Android APK 一键打包脚本
# 用法：
#   ./scripts/build-apk.sh                        # 默认打 release，版本取自 android/app/build.gradle
#   ./scripts/build-apk.sh 1.8.2 9                # 指定 versionName=1.8.2 versionCode=9
#   VERSION_NAME=1.8.2 VERSION_CODE=9 ./scripts/build-apk.sh
# 产物：
#   android/app/build/outputs/apk/release/app-release.apk
# 同时会复制到 release-apk/xianxia-v${VERSION_NAME}.apk（若目录可写）
# =====================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# -------- 参数解析 --------
VERSION_NAME="${1:-${VERSION_NAME:-}}"
VERSION_CODE="${2:-${VERSION_CODE:-}}"

echo "[1/5] 检查 Node & 依赖..."
if [ ! -d node_modules ]; then
  echo "未发现 node_modules，执行 npm ci / npm install..."
  if [ -f package-lock.json ]; then npm ci; else npm install; fi
fi

echo "[2/5] 构建 Web 资源 (vite build)..."
npm run build

echo "[3/5] Capacitor 同步资源到 android 工程..."
npx cap sync android

# -------- 版本号注入 --------
EXTRA_GRADLE_ARGS=("--no-daemon")
if [ -n "$VERSION_CODE" ]; then
  EXTRA_GRADLE_ARGS+=("-PVERSION_CODE=$VERSION_CODE")
fi
if [ -n "$VERSION_NAME" ]; then
  EXTRA_GRADLE_ARGS+=("-PVERSION_NAME=$VERSION_NAME")
fi

echo "[4/5] Gradle 构建 release APK  args=(${EXTRA_GRADLE_ARGS[*]})..."
cd "$ROOT_DIR/android"
# 优先使用系统 gradle（避免 wrapper 下载超时），无则回退到 gradlew
if command -v gradle >/dev/null 2>&1; then
  echo "使用系统 gradle: $(gradle --version 2>/dev/null | grep -m1 Gradle)"
  gradle assembleRelease "${EXTRA_GRADLE_ARGS[@]}"
elif [ -f ./gradlew ]; then
  chmod +x ./gradlew
  ./gradlew assembleRelease "${EXTRA_GRADLE_ARGS[@]}"
else
  echo "ERROR: 未找到 gradle 或 android/gradlew，请先安装 gradle 或执行 npx cap add android" >&2
  exit 1
fi

APK_SRC="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
echo "[5/5] 构建完成 -> $APK_SRC"
ls -lh "$APK_SRC"

# 复制到 release-apk 方便归档
OUT_DIR="$ROOT_DIR/release-apk"
if [ -n "$VERSION_NAME" ]; then
  mkdir -p "$OUT_DIR"
  DEST="$OUT_DIR/xianxia-v${VERSION_NAME}.apk"
  cp -f "$APK_SRC" "$DEST"
  echo "已归档到: $DEST"
fi

# 尝试 dump 版本信息
if command -v aapt >/dev/null 2>&1; then
  echo "--- APK 信息 ---"
  aapt dump badging "$APK_SRC" 2>/dev/null | grep -E "package|versionCode|versionName|application:" || true
fi
