# Taries Beauty — Android (Capacitor)

This wraps the Next.js static export (`../out`) into a Capacitor Android APK.

Built locally only if you have Java 17 + Android SDK. Otherwise CI builds it
via `.github/workflows/release-taries-app.yml`.

## Local build

```bash
# from this dir
npm install
# generate android/ folder (first time only)
npx cap add android
# build the web app + sync + assemble release APK
npm run build
# APK lands at android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Notes

- `webDir` points to the Next.js static export at `../out/`.
- `appId`: `com.tariesbeauty.app`
- v1 APKs are debug-signed for sideloading. For Play Store submission,
  generate a real upload key and configure `android/app/build.gradle` signing.
- App icons + splash regenerated from `resources/icon.png` + `resources/splash.png`
  via `npx @capacitor/assets generate --android --assetPath resources`.
