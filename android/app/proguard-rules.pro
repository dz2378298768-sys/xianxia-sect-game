# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ========== Dirichlet 聚合广告 SDK（避免二次混淆报错） ==============================
-keep class com.tapsdk.tapad.group.** { *; }
-keep class com.bytedance.sdk.openadsdk.** { *; }
-keep class com.qq.e.** { *; }

# ========== TapTap 更新唤起 SDK v4（官方 FAQ 推荐） ==================================
# 官方 FAQ：https://developer.taptap.cn/docs/sdk/update/faq/
-keep class com.tds.** { *; }
-keep class com.taptap.** { *; }
-keep class com.tapsdk.** { *; }
-keep class tds.androidx.** { *; }

