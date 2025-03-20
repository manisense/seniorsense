import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import * as Device from 'expo-device';

// Configure notification handler globally
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: 'max', // Using string instead of enum
  }),
});

// Define types for triggers
export type DateTrigger = {
  seconds: number;
  repeats?: boolean;
};

export type DailyTrigger = {
  hour: number;
  minute: number;
  repeats?: boolean;
};

// Store pending scheduled notifications to ensure they get scheduled
interface PendingNotification {
  id?: string; // Will be null until successfully scheduled
  content: { 
    title: string; 
    body: string; 
    sound?: boolean | string;
    data?: any;
  };
  trigger: DateTrigger | DailyTrigger;
  createdAt: string;
  attempts: number;
}

// Define the NotificationRequest type to match Expo's API
type NotificationRequest = {
  identifier: string;
  content: {
    title: string;
    body: string;
    data: Record<string, any>;
    sound?: boolean | string;
    badge?: number;
  };
  trigger: any;
};

export const notificationService = {
  /**
   * Request notification permissions
   */
  requestPermissions: async () => {
    try {
      // For physical devices, we need to check if the device has notifications capabilities
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.requestPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          console.log('Requesting notification permissions...');
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('Notification permission not granted');
          return { status: finalStatus };
        }
      }
      
      // For simulators/emulators, permissions are automatically granted
      return { status: 'granted' };
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
        importance: 5, // MAX = 5 in Android
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      
      // Create a default channel for other notifications
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: 4, // HIGH = 4 in Android
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  },
  
  /**
   * Process any pending notifications that failed to schedule previously
   */
  processPendingNotifications: async (): Promise<void> => {
    try {
      const pendingNotifications = await getPendingNotifications();
      
      if (pendingNotifications.length === 0) {
        return;
      }
      
      console.log(`Processing ${pendingNotifications.length} pending notifications`);
      
      for (const pendingNotification of pendingNotifications) {
        try {
          // Skip if already attempted too many times
          if (pendingNotification.attempts >= 3) {
            console.log('Max attempts reached for pending notification, skipping');
            continue;
          }
          
          // Try to schedule it
          const notificationId = await notificationService.scheduleNotification(
            pendingNotification.content,
            pendingNotification.trigger
          );
          
          if (notificationId) {
            // Update with successful ID and remove from pending
            pendingNotification.id = notificationId;
            await removePendingNotification(
              pendingNotification.content,
              pendingNotification.trigger
            );
          }
        } catch (err) {
          console.error('Error processing pending notification:', err);
          // Increment attempts
          pendingNotification.attempts += 1;
          await updatePendingNotification(pendingNotification);
        }
      }
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  },
  
  /**
   * Initialize notification service
   */
  initialize: async () => {
    try {
      // Set up notification channels
      await notificationService.setupNotificationChannels();
      
      // Check for and schedule any pending notifications
      await notificationService.processPendingNotifications();
      
      // Set up notification received handler
      const subscription1 = Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
        console.log('Notification received:', notification);
      });
      
      // Set up notification response handler
      const subscription2 = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
        console.log('Notification response received:', response);
        const { notification } = response;
        // Handle user interaction with notification
        if (notification.request.content.data) {
          const data = notification.request.content.data;
          console.log('Notification data:', data);
          // You can dispatch actions or navigate based on the data
        }
      });
      
      console.log('Notification service initialized');
      
      // Return a cleanup function (can be used if needed)
      return () => {
        subscription1.remove();
        subscription2.remove();
      };
    } catch (error) {
      console.error('Error initializing notification service:', error);
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
      const notificationContent: Notifications.NotificationContentInput = {
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
        // @ts-ignore - vibrationPattern is available on Android
        notificationContent.vibrationPattern = [0, 250, 250, 250, 250, 250];
        // @ts-ignore - color is available on Android
        notificationContent.color = '#2563EB';
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
      
      try {
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
        console.error('Failed to schedule notification:', error);
        
        // Store as pending notification to try again later
        await storePendingNotification(content, trigger);
        
        throw error;
      }
    } catch (error) {
      console.error('Error in scheduleNotification:', error);
      return '';
    }
  },
  
  /**
   * Cancel a specific notification
   */
  cancelNotification: async (notificationId: string): Promise<void> => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      await removeNotificationId(notificationId);
      console.log(`Cancelled notification with ID: ${notificationId}`);
    } catch (error) {
      console.error(`Error cancelling notification ${notificationId}:`, error);
    }
  },
  
  /**
   * Cancel all scheduled notifications
   */
  cancelAllNotifications: async (): Promise<void> => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all notifications');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  },
  
  /**
   * Test notification for development
   */
  testNotification: async (): Promise<string> => {
    const now = new Date();
    const content = {
      title: 'Test Notification',
      body: `This is a test notification sent at ${now.toLocaleTimeString()}`,
      data: { type: 'test' },
    };
    
    // Send in 5 seconds
    const trigger: DateTrigger = {
      seconds: 5,
    };
    
    return await notificationService.scheduleNotification(content, trigger);
  },
  
  /**
   * Get the count of pending notifications
   */
  getPendingNotificationsCount: async (): Promise<number> => {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications.length;
    } catch (error) {
      console.error('Error getting pending notification count:', error);
      return 0;
    }
  },
  
  /**
   * Get all scheduled notifications
   */
  getScheduledNotifications: async (): Promise<NotificationRequest[]> => {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }
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
    if (!storedIds) return;
    
    const ids = JSON.parse(storedIds);
    const filteredIds = ids.filter((id: string) => id !== notificationId);
    
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_IDS, JSON.stringify(filteredIds));
  } catch (error) {
    console.error('Error removing notification ID:', error);
  }
}

// Helper functions for managing pending notifications
async function storePendingNotification(
  content: { title: string; body: string; sound?: boolean | string; data?: any },
  trigger: DateTrigger | DailyTrigger
) {
  try {
    const pendingNotification: PendingNotification = {
      content,
      trigger,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    
    const storedNotifications = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_NOTIFICATIONS);
    const notifications = storedNotifications ? JSON.parse(storedNotifications) : [];
    
    notifications.push(pendingNotification);
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_NOTIFICATIONS, JSON.stringify(notifications));
    
    console.log('Stored pending notification for later retry');
  } catch (error) {
    console.error('Error storing pending notification:', error);
  }
}

async function getPendingNotifications(): Promise<PendingNotification[]> {
  try {
    const storedNotifications = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_NOTIFICATIONS);
    return storedNotifications ? JSON.parse(storedNotifications) : [];
  } catch (error) {
    console.error('Error getting pending notifications:', error);
    return [];
  }
}

async function updatePendingNotification(pendingNotification: PendingNotification) {
  try {
    const storedNotifications = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_NOTIFICATIONS);
    if (!storedNotifications) return;
    
    const notifications: PendingNotification[] = JSON.parse(storedNotifications);
    
    // Find and replace the notification
    const index = notifications.findIndex(
      (n) => 
        n.content.title === pendingNotification.content.title && 
        n.content.body === pendingNotification.content.body
    );
    
    if (index !== -1) {
      notifications[index] = pendingNotification;
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_NOTIFICATIONS, JSON.stringify(notifications));
    }
  } catch (error) {
    console.error('Error updating pending notification:', error);
  }
}

async function removePendingNotification(
  content: { title: string; body: string; sound?: boolean | string; data?: any },
  trigger: DateTrigger | DailyTrigger
) {
  try {
    const storedNotifications = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_NOTIFICATIONS);
    if (!storedNotifications) return;
    
    const notifications: PendingNotification[] = JSON.parse(storedNotifications);
    
    // Remove matching notification
    const filtered = notifications.filter(
      (n) => !(n.content.title === content.title && n.content.body === content.body)
    );
    
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_NOTIFICATIONS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing pending notification:', error);
  }
}