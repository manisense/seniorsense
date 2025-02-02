import * as Notifications from 'expo-notifications';

export const notificationService = {
  async requestPermissions() {
    return await Notifications.requestPermissionsAsync();
  },

  async scheduleNotification(content: any, trigger: any) {
    return await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });
  },
};