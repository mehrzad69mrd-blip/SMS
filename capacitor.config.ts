import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smshub.app',
  appName: 'SMS Hub & Scheduler',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
