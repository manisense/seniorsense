import * as SMS from 'expo-sms';

export const smsService = {
  async isAvailable() {
    return await SMS.isAvailableAsync();
  },

  async sendSMS(phoneNumbers: string[], message: string) {
    return await SMS.sendSMSAsync(phoneNumbers, message);
  },
};