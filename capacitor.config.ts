import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.timquran.app',
  appName: "Tim Qur'an",
  webDir: 'out',
  server: {
    // Mode remote: APK load dari URL deployed
    // Mode local: Set CAPACITOR_SERVER_URL=http://192.168.x.x:3000 untuk dev
    url: process.env.CAPACITOR_SERVER_URL || 'https://timquran.my.id',
    cleartext: false,
    allowNavigation: [
      'timquran.my.id',
      '*.timquran.my.id',
      '*.supabase.co',
      '*.storage.dev',
      'localhost',
    ],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    backgroundColor: '#fcfbf9',
    initialFocus: true,
    // Performance optimizations
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#fcfbf9',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      launchAutoHide: true,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DEFAULT',
      backgroundColor: '#fcfbf9',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
