import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';
import { notificationService } from './notificationService';
import * as Notifications from 'expo-notifications';

// Define a background task name
const PILL_REMINDER_BACKGROUND_TASK = 'PILL_REMINDER_BACKGROUND_TASK';

// Register the task if it hasn't been registered yet
if (!TaskManager.isTaskDefined(PILL_REMINDER_BACKGROUND_TASK)) {
  TaskManager.defineTask(PILL_REMINDER_BACKGROUND_TASK, async ({ data, error }) => {
    if (error) {
      console.error('Error in background pill reminder task:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    
    try {
      console.log('Running pill reminder background task');
      
      // Check for recent notifications that need announcing
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Find pill reminders scheduled for the next minute
      const now = new Date();
      const upcoming = notifications.filter(notification => {
        // Get notification data
        const data = notification.content.data;
        
        // Check if this is a pill reminder
        if (data && typeof data === 'object' && data.type === 'pill-reminder') {
          // Get the scheduled time
          const trigger = notification.trigger;
          if (trigger && typeof trigger === 'object' && 'hour' in trigger && 'minute' in trigger) {
            // Check if this notification is scheduled for now (+/- 1 minute)
            const notifHour = trigger.hour as number;
            const notifMinute = trigger.minute as number;
            
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            // Simple check: if hour and minute match (or are 1 minute apart)
            return (
              (notifHour === currentHour && Math.abs(notifMinute - currentMinute) <= 1) ||
              // Handle hour boundaries
              (Math.abs(notifHour - currentHour) === 1 && 
               ((notifMinute === 59 && currentMinute === 0) || 
                (notifMinute === 0 && currentMinute === 59)))
            );
          }
        }
        return false;
      });
      
      // Announce each upcoming pill reminder
      for (const notification of upcoming) {
        const data = notification.content.data;
        if (data && typeof data === 'object' && data.medicineName) {
          console.log('Background task announcing pill reminder:', data.medicineName);
          await notificationService.announcePillReminder(data.medicineName);
        }
      }
      
      return upcoming.length > 0 
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
      console.error('Error in pill reminder background task:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

/**
 * Service for handling pill reminder background tasks
 */
export const pillReminderBackgroundService = {
  /**
   * Register the background task to run periodically
   */
  registerBackgroundTask: async (): Promise<boolean> => {
    try {
      // Only register on physical devices
      if (Platform.OS === 'web') {
        console.log('Background tasks not supported on web');
        return false;
      }
      
      // Register the background fetch task
      const status = await BackgroundFetch.registerTaskAsync(PILL_REMINDER_BACKGROUND_TASK, {
        minimumInterval: 60, // Run at most every minute
        stopOnTerminate: false, // Continue running after app is terminated
        startOnBoot: true, // Run task on device boot
      });
      
      console.log('Registered pill reminder background task with status:', status);
      return true;
    } catch (error) {
      console.error('Error registering pill reminder background task:', error);
      return false;
    }
  },
  
  /**
   * Unregister the background task
   */
  unregisterBackgroundTask: async (): Promise<boolean> => {
    try {
      await BackgroundFetch.unregisterTaskAsync(PILL_REMINDER_BACKGROUND_TASK);
      console.log('Unregistered pill reminder background task');
      return true;
    } catch (error) {
      console.error('Error unregistering pill reminder background task:', error);
      return false;
    }
  },
  
  /**
   * Check if the background task is registered
   */
  isBackgroundTaskRegistered: async (): Promise<boolean> => {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      return status === BackgroundFetch.BackgroundFetchStatus.Available;
    } catch (error) {
      console.error('Error checking pill reminder background task status:', error);
      return false;
    }
  },
}; 