# Taries Beauty — Desktop (Electron)

Wraps the static Next.js export (`../out/`) into a desktop app for
macOS, Windows, and Linux.

## Local

```bash
npm install
# build web export & copy into ./web
npm run build:web
npm run copy:web
# launch dev
npm start
# package current OS
npm run dist
```

Outputs land in `dist/`.

## Targets

- **macOS**: `.dmg` and `.zip` (x64 + arm64 universal)
- **Windows**: `.exe` installer (NSIS) and portable
- **Linux**: `.AppImage` and `.deb`

CI builds all platforms via `.github/workflows/release-taries-app.yml`.
