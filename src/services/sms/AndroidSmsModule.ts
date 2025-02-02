import { NativeModules, Platform, PermissionsAndroid, Alert } from 'react-native';
import * as SMS from 'expo-sms';
import * as Permissions from 'expo-permissions';

interface AndroidSmsModule {
  sendDirectSMS: (phoneNumber: string, message: string) => Promise<boolean>;
  requestSMSPermission: () => Promise<boolean>;
}

const { AndroidSmsModule: NativeAndroidSmsModule } = NativeModules;

export const SMSService = {
  async requestSMSPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      if (!NativeAndroidSmsModule) {
        console.warn('[SMS] Native module not available, using default permissions');
        return true;
      }
      console.log('[SMS] Requesting SMS permission');
      const granted = await NativeAndroidSmsModule.requestSMSPermission();
      console.log('[SMS] Permission result:', granted);
      return granted;
    } catch (error) {
      console.error('[SMS] Permission error:', error);
      return false;
    }
  },

  async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return this._sendSMSWithExpo([phoneNumber], message);
    }

    try {
      if (!NativeAndroidSmsModule) {
        console.warn('[SMS] Native module not available, falling back to expo-sms');
        return this._sendSMSWithExpo([phoneNumber], message);
      }
      return await NativeAndroidSmsModule.sendDirectSMS(phoneNumber, message);
    } catch (error) {
      console.error('[SMS] Send error:', error);
      // Fallback to expo-sms if native module fails
      return this._sendSMSWithExpo([phoneNumber], message);
    }
  },

  async _sendSMSWithExpo(phoneNumbers: string[], message: string): Promise<boolean> {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('SMS is not available on this device');
    }
    await SMS.sendSMSAsync(phoneNumbers, message);
    return true;
  }
};