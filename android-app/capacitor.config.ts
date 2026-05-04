import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tariesbeauty.app',
  appName: 'Taries Beauty',
  webDir: '../out',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
  backgroundColor: '#0A0A0A',
};

export default config;
