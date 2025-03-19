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
type DateTrigger = {
  seconds: number;
  repeats?: boolean;
};

type DailyTrigger = {
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

export const notificationService = {
  /**
   * Request notification permissions
   */
  requestPermissions: async () => {
    try {
      // For physical devices, we need to check if the device has notifications capabilities
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
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
   * Initialize notification service
   */
  initialize: async () => {
    try {
      // Set up notification channels
      await notificationService.setupNotificationChannels();
      
      // Check for and schedule any pending notifications
      await notificationService.processPendingNotifications();
      
      // Set up notification received handler
      const subscription1 = Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
      });
      
      // Set up notification response handler
      const subscription2 = Notifications.addNotificationResponseReceivedListener((response) => {
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
        notificationContent.vibrationPattern = [0, 250, 250, 250, 250, 250];
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
        
        // Remove from pending notifications if it was there
        await removePendingNotification(content, trigger);
        
        return notificationId;
      } catch (scheduleError) {
        // If scheduling fails, store it for later attempts
        console.error('Failed to schedule notification, storing for retry:', scheduleError);
        await storePendingNotification(content, trigger);
        return 'pending_' + new Date().getTime().toString();
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
      // Store failed notification for later retry
      await storePendingNotification(content, trigger);
      return 'pending_' + new Date().getTime().toString();
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
      
      for (const notification of pendingNotifications) {
        try {
          // Increment attempts
          notification.attempts += 1;
          
          // Skip if too many attempts (max 5)
          if (notification.attempts > 5) {
            console.log(`Skipping notification after ${notification.attempts} attempts`);
            await removePendingNotification(notification.content, notification.trigger);
            continue;
          }
          
          // Try to schedule
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: notification.content,
            trigger: notification.trigger,
          });
          
          console.log(`Successfully scheduled pending notification with ID: ${notificationId}`);
          
          // Store the notification ID and remove from pending
          await storeNotificationId(notificationId);
          await removePendingNotification(notification.content, notification.trigger);
        } catch (error) {
          console.error('Failed to process pending notification:', error);
          // Update the attempts count in storage
          await updatePendingNotification(notification);
        }
      }
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  },
  
  /**
   * Cancel a specific notification
   */
  cancelNotification: async (notificationId: string): Promise<boolean> => {
    try {
      // Skip pending notifications (they're not yet scheduled)
      if (notificationId.startsWith('pending_')) {
        return true;
      }
      
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
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_NOTIFICATIONS);
      
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
  
  /**
   * Get all pending notifications that failed to schedule
   */
  getPendingNotificationsCount: async (): Promise<number> => {
    try {
      const pendingNotifications = await getPendingNotifications();
      return pendingNotifications.length;
    } catch (error) {
      console.error('Error getting pending notification count:', error);
      return 0;
    }
  },
  
  /**
   * Get all scheduled notifications (for debugging)
   */
  getScheduledNotifications: async (): Promise<Notifications.NotificationRequest[]> => {
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
    if (storedIds) {
      const ids = JSON.parse(storedIds);
      const filteredIds = ids.filter((id: string) => id !== notificationId);
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_IDS, JSON.stringify(filteredIds));
    }
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
    const pendingNotifications = await getPendingNotifications();
    
    // Find the notification by comparing content and created time
    const updatedNotifications = pendingNotifications.map(notification => {
      if (
        notification.content.title === pendingNotification.content.title &&
        notification.content.body === pendingNotification.content.body &&
        notification.createdAt === pendingNotification.createdAt
      ) {
        return pendingNotification;
      }
      return notification;
    });
    
    await AsyncStorage.setItem(
      STORAGE_KEYS.PENDING_NOTIFICATIONS,
      JSON.stringify(updatedNotifications)
    );
  } catch (error) {
    console.error('Error updating pending notification:', error);
  }
}

async function removePendingNotification(
  content: { title: string; body: string; sound?: boolean | string; data?: any },
  trigger: DateTrigger | DailyTrigger
) {
  try {
    const pendingNotifications = await getPendingNotifications();
    
    // Filter out the notification that matches this content
    const filteredNotifications = pendingNotifications.filter(notification => {
      return !(
        notification.content.title === content.title &&
        notification.content.body === content.body &&
        JSON.stringify(notification.trigger) === JSON.stringify(trigger)
      );
    });
    
    if (pendingNotifications.length !== filteredNotifications.length) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_NOTIFICATIONS,
        JSON.stringify(filteredNotifications)
      );
      console.log('Removed pending notification after successful scheduling');
    }
  } catch (error) {
    console.error('Error removing pending notification:', error);
  }
}