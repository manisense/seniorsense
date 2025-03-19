import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';

// Configure notification handler globally
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Define types for triggers
type DateTrigger = {
  seconds: number;
  repeats?: boolean;
};

type DailyTrigger = {
  hour: number;
  minute: number;
  repeats?: boolean;
};

export const notificationService = {
  /**
   * Request notification permissions
   */
  requestPermissions: async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Notification permission not granted');
      }
      
      return { status };
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return { status: 'error' };
    }
  },
  
  /**
   * Set up notification channels for Android
   */
  setupNotificationChannels: async () => {
    if (Platform.OS === 'android') {
      // Create a high priority channel for pill reminders
      await Notifications.setNotificationChannelAsync('pill-reminders', {
        name: 'Pill Reminders',
        importance: 4, // HIGH = 4
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      
      // Create a default channel for other notifications
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: 3, // DEFAULT = 3
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  },
  
  /**
   * Schedule a notification
   */
  scheduleNotification: async (
    content: { 
      title: string; 
      body: string; 
      sound?: boolean | string;
      data?: any;
    }, 
    trigger: DateTrigger | DailyTrigger
  ): Promise<string> => {
    try {
      // Set up notification channels if needed
      await notificationService.setupNotificationChannels();
      
      // Configure the notification
      const notificationContent: any = {
        title: content.title,
        body: content.body,
        data: content.data || {},
      };
      
      // Configure sound (default is true)
      if (content.sound !== false) {
        notificationContent.sound = 'default';
      }
      
      // Use pill-reminders channel for Android
      if (Platform.OS === 'android') {
        notificationContent.channelId = 'pill-reminders';
        notificationContent.vibrationPattern = [0, 250, 250, 250, 250, 250];
      }
      
      // Convert our trigger type to Expo's expected format
      let notificationTrigger: any;
      
      if ('seconds' in trigger) {
        notificationTrigger = {
          seconds: trigger.seconds,
        };
        if (trigger.repeats) {
          notificationTrigger.repeats = trigger.repeats;
        }
      } else if ('hour' in trigger && 'minute' in trigger) {
        notificationTrigger = {
          hour: trigger.hour,
          minute: trigger.minute,
        };
        if (trigger.repeats) {
          notificationTrigger.repeats = trigger.repeats;
        }
      }
      
      // Schedule the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: notificationTrigger,
      });
      
      console.log(`Scheduled notification with ID: ${notificationId}`);
      
      // Store the notification ID for later reference
      await storeNotificationId(notificationId);
      
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  },
  
  /**
   * Cancel a specific notification
   */
  cancelNotification: async (notificationId: string): Promise<boolean> => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Cancelled notification with ID: ${notificationId}`);
      
      // Remove from storage
      await removeNotificationId(notificationId);
      
      return true;
    } catch (error) {
      console.error(`Error cancelling notification ${notificationId}:`, error);
      return false;
    }
  },
  
  /**
   * Cancel all scheduled notifications
   */
  cancelAllNotifications: async (): Promise<boolean> => {
    try {
      // Get all stored notification IDs and cancel them individually
      const storedIds = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_IDS);
      if (storedIds) {
        const ids = JSON.parse(storedIds);
        console.log(`Cancelling ${ids.length} stored notifications`);
        
        for (const id of ids) {
          try {
            await Notifications.cancelScheduledNotificationAsync(id);
          } catch (err) {
            console.error(`Failed to cancel notification ${id}:`, err);
          }
        }
      }
      
      console.log('Cancelled all scheduled notifications');
      
      // Clear storage
      await AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATION_IDS);
      
      return true;
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
      return false;
    }
  },
  
  /**
   * Send a test notification immediately
   */
  testNotification: async (): Promise<string> => {
    try {
      // Set up notification channels if needed
      await notificationService.setupNotificationChannels();
      
      const notificationContent = {
        title: '🔔 Test Notification',
        body: 'This is a test notification to verify your settings are working correctly.',
        sound: 'default',
        data: { type: 'test' },
      };
      
      // Schedule for 2 seconds from now
      const trigger = { seconds: 2 };
      
      const notificationId = await notificationService.scheduleNotification(
        notificationContent,
        trigger
      );
      
      console.log(`Scheduled test notification with ID: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  },
};

// Helper functions for managing notification IDs
async function storeNotificationId(notificationId: string) {
  try {
    const storedIds = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_IDS);
    const ids = storedIds ? JSON.parse(storedIds) : [];
    
    if (!ids.includes(notificationId)) {
      ids.push(notificationId);
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_IDS, JSON.stringify(ids));
    }
  } catch (error) {
    console.error('Error storing notification ID:', error);
  }
}

async function removeNotificationId(notificationId: string) {
  try {
    const storedIds = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_IDS);
    if (storedIds) {
      const ids = JSON.parse(storedIds);
      const filteredIds = ids.filter((id: string) => id !== notificationId);
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_IDS, JSON.stringify(filteredIds));
    }
  } catch (error) {
    console.error('Error removing notification ID:', error);
  }
}