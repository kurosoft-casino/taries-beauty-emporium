// Minimal preload — no Node APIs exposed to the renderer.
// Hook in window.tariesDesktop = { version: ... } if needed later.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('tariesDesktop', {
  platform: process.platform,
  version: process.versions.electron,
});
