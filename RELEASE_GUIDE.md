# Release Guide — Tim Qur'an Pengajar

> Panduan lengkap untuk membangun dan merilis aplikasi Android.

---

## Prerequisites

```bash
# Pastikan Flutter terinstall
flutter --version  # Flutter ≥ 3.29, Dart ≥ 3.7

# Pastikan Android SDK terinstall
flutter doctor -v
# Harus menunjukkan ✓ Android toolchain

# Pastikan NDK terinstall (compileSdk 36)
# Jika error NDK, jalankan:
# sdkmanager "ndk;27.0.12077973"
```

---

## Step 1: Setup Environment

```bash
cd mobile_flutter/

# Install dependencies
flutter pub get

# Generate code (freezed, json_serializable)
dart run build_runner build --delete-conflicting-outputs
```

---

## Step 2: Configure Base URL

### Development (localhost)
```dart
// lib/app/environment.dart
static const String apiBaseUrl = 'http://10.0.2.2:3000'; // Android emulator
// atau
static const String apiBaseUrl = 'http://localhost:3000'; // physical device
```

### Production
```dart
// lib/app/environment.dart
static const String apiBaseUrl = 'https://timquran.my.id';
```

### Environment Variable (Recommended)
```bash
# Saat build:
flutter build apk --release --dart-define=API_BASE_URL=https://timquran.my.id
```

---

## Step 3: Build

### APK (Debug)
```bash
flutter build apk --debug
# Output: build/app/outputs/flutter-apk/app-debug.apk
# Ukuran: ~213 MB
```

### APK (Release)
```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
# Ukuran: ~75 MB
```

### AAB (Google Play Store)
```bash
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab
# Ukuran: ~36 MB
```

### AAB dengan Custom Base URL
```bash
flutter build appbundle --release --dart-define=API_BASE_URL=https://timquran.my.id
```

---

## Step 4: Signing (Release)

### Buat Keystore
```bash
keytool -genkey -v -keystore ~/timquran-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias timquran
```

### Buat key.properties
```properties
# android/key.properties (JANGAN di-commit)
storePassword=<password>
keyPassword=<password>
keyAlias=timquran
storeFile=<path>/timquran-release.jks
```

### Update build.gradle.kts
```kotlin
// android/app/build.gradle.kts
android {
    signingConfigs {
        create("release") {
            keyAlias = "timquran"
            keyPassword = project.findProperty("keyPassword") as String
            storeFile = file(project.findProperty("storeFile") as String)
            storePassword = project.findProperty("storePassword") as String
        }
    }
    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            isShrinkResources = true
        }
    }
}
```

### Build Release Signed
```bash
cd android/
./gradlew assembleRelease
# atau
flutter build apk --release
```

---

## Step 5: Verify

```bash
# Cek keamanan — pastikan tidak ada secret di APK
find build/ -name "*.apk" -exec grep -l "SUPABASE_SERVICE_ROLE" {} \;
# Output: (harus kosong)

# Cek permission
aapt dump badging build/app/outputs/flutter-apk/app-release.apk | grep "uses-permission"
# Output:
# android.permission.INTERNET
# android.permission.CAMERA

# Cek ukuran
ls -lh build/app/outputs/flutter-apk/app-release.apk
ls -lh build/app/outputs/bundle/release/app-release.aab
```

---

## Step 6: Distribute

### Internal Testing (tanpa Play Store)
```bash
# Copy APK ke perangkat via USB
adb install build/app/outputs/flutter-apk/app-release.apk

# Atau kirim file APK via WhatsApp/Telegram/Email
```

### Google Play Store
1. Login ke [Google Play Console](https://play.google.com/console)
2. Buat aplikasi baru: `com.timquran.pengajar`
3. Upload AAB ke track "Internal Testing" atau "Production"
4. Isi listing: nama, deskripsi, screenshot, icon
5. Submit untuk review

---

## File yang Dihasilkan

| File | Kegunaan |
|------|----------|
| `app-debug.apk` | Untuk development & testing |
| `app-release.apk` | Untuk distribusi langsung (sideloading) |
| `app-release.aab` | Untuk Google Play Store |

---

## Rollback

Jika ada masalah dengan versi baru:
1. Uninstall versi baru dari perangkat
2. Install versi APK lama yang masih berfungsi
3. Atau upload versi AAB lama ke Google Play Console

---

## Security Checklist

- [ ] Tidak ada `SUPABASE_SERVICE_ROLE_KEY` di APK
- [ ] Tidak ada `NEXTAUTH_SECRET` di APK
- [ ] Tidak ada password di source code
- [ ] `.env` dan `key.properties` di `.gitignore`
- [ ] Token hanya disimpan di `flutter_secure_storage`
- [ ] Tidak ada `console.log` dengan data sensitif
- [ ] Tidak ada HTTP di production (semua HTTPS)
- [ ] Backend memvalidasi token di setiap endpoint
- [ ] Backend memvalidasi role pengguna
- [ ] Backend memvalidasi data ownership
