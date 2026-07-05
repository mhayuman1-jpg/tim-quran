# Tim Qur'an ProGuard / R8 rules
# Optimized for Capacitor 8.x compatibility

# ── Capacitor WebView Bridge ─────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.annotation.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PluginMethod *;
}

# ── Capacitor Cordova Bridge ────────────────────────────────
-keep class org.apache.cordova.** { *; }
-keep class com.google.android.gms.** { *; }

# ── AndroidX / WebView ─────────────────────────────────────
-keep class androidx.webkit.** { *; }
-keep class android.webkit.** { *; }

# ── JSON / Gson ─────────────────────────────────────────────
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class com.google.gson.** { *; }

# ── OkHttp (used by Capacitor) ─────────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# ── JavaScript Interface ───────────────────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── Common Android ─────────────────────────────────────────
-keep class * extends android.app.Activity { *; }
-keep class * extends android.app.Service { *; }
-keep class * extends android.content.BroadcastReceiver { *; }
-keep class * extends android.content.ContentProvider { *; }

# ── Keep Application class ─────────────────────────────────
-keep class com.timquran.app.** { *; }

# ── Remove debug logs in release ───────────────────────────
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
