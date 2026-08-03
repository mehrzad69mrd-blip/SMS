import { registerPlugin } from '@capacitor/core';

export interface NativeSMS {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isRead: boolean;
}

export interface RealSMSPluginType {
  hasPermission(): Promise<{ readSMS: boolean; sendSMS: boolean; granted: boolean }>;
  requestPermission(): Promise<{ requested: boolean }>;
  getInboxSMS(): Promise<{ messages: NativeSMS[] }>;
  sendRealSMS(options: { phoneNumber: string; messageText: string }): Promise<{ success: boolean }>;
  isDefaultSmsApp(): Promise<{ isDefault: boolean }>;
  requestDefaultSmsApp(): Promise<{ requested: boolean }>;
}

// Register the custom Capacitor native plugin
const RealSMSNative = registerPlugin<RealSMSPluginType>('RealSMS');

export const isNativeAndroid = (): boolean => {
  // Check if Capacitor platform is Android
  return (window as any).Capacitor?.getPlatform() === 'android';
};

export const checkSmsPermissions = async (): Promise<boolean> => {
  if (!isNativeAndroid()) return false;
  try {
    const result = await RealSMSNative.hasPermission();
    return result.granted;
  } catch (err) {
    console.error("Error checking permissions:", err);
    return false;
  }
};

export const requestSmsPermissions = async (): Promise<void> => {
  if (!isNativeAndroid()) return;
  try {
    await RealSMSNative.requestPermission();
  } catch (err) {
    console.error("Error requesting permissions:", err);
  }
};

export const fetchRealInboxSMS = async (): Promise<NativeSMS[]> => {
  if (!isNativeAndroid()) return [];
  try {
    const result = await RealSMSNative.getInboxSMS();
    return result.messages || [];
  } catch (err) {
    console.error("Error fetching native SMS:", err);
    return [];
  }
};

export const sendNativeSMS = async (phoneNumber: string, messageText: string): Promise<boolean> => {
  if (!isNativeAndroid()) return false;
  try {
    const result = await RealSMSNative.sendRealSMS({ phoneNumber, messageText });
    return result.success;
  } catch (err) {
    console.error("Error sending native SMS:", err);
    return false;
  }
};

export const checkIsDefaultSmsApp = async (): Promise<boolean> => {
  if (!isNativeAndroid()) return false;
  try {
    const result = await RealSMSNative.isDefaultSmsApp();
    return result.isDefault;
  } catch (err) {
    console.error("Error checking default SMS status:", err);
    return false;
  }
};

export const promptSetDefaultSmsApp = async (): Promise<boolean> => {
  if (!isNativeAndroid()) return false;
  try {
    const result = await RealSMSNative.requestDefaultSmsApp();
    return result.requested;
  } catch (err) {
    console.error("Error requesting default SMS setup:", err);
    return false;
  }
};

