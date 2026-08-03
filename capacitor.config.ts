import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smshub.app',
  appName: 'SMS Hub & Scheduler',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://ais-dev-vlumqznxd2rtpvfhuujgno-499487228125.us-west2.run.app',
    allowNavigation: [
      'ais-dev-vlumqznxd2rtpvfhuujgno-499487228125.us-west2.run.app',
      'ais-pre-vlumqznxd2rtpvfhuujgno-499487228125.us-west2.run.app'
    ]
  }
};

export default config;
