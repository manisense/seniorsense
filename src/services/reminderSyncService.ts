import AsyncStorage from '@react-native-async-storage/async-storage';
import { Reminder, SyncStatus } from '../features/reminders/types/reminder.types';
import { STORAGE_KEYS } from '../utils/constants';
import { isConnected } from '../utils/networkUtils';
import supabase from './supabase';
import { authService } from './auth.service';
import { Platform } from 'react-native';
import { reminderService } from './reminderService';
import {
  getSyncQueue,
  removeFromSyncQueue,
  clearSyncQueue
} from './syncQueueService';

// Safely import TaskManager and BackgroundFetch to handle missing native modules
let BackgroundFetch: any = null;
let TaskManager: any = null;
let bgFetchAvailable = false;

try {
  BackgroundFetch = require('expo-background-fetch');
  TaskManager = require('expo-task-manager');
  bgFetchAvailable = true;
} catch (error) {
  console.warn('Background fetch or TaskManager not available:', error);
  bgFetchAvailable = false;
}

// Task name for background sync
const SYNC_TASK_NAME = 'BACKGROUND_SYNC_REMINDERS';

// Safely register the background task only if available
if (bgFetchAvailable && TaskManager) {
  try {
    if (!TaskManager.isTaskDefined(SYNC_TASK_NAME)) {
      TaskManager.defineTask(SYNC_TASK_NAME, async () => {
        try {
          const needsSync = await hasPendingReminders();
          if (needsSync) {
            const success = await syncPendingReminders();
            return success ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.Failed;
          }
          return BackgroundFetch.BackgroundFetchResult.NoData;
        } catch (error) {
          console.error('Error in background sync task:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });
      console.log('Background sync task defined successfully');
    }
  } catch (error) {
    console.warn('Error defining background sync task:', error);
  }
}

/**
 * Reminder Sync Service
 * Handles synchronization of reminders with Supabase
 */

/**
 * Service to handle background sync and synchronization of reminders
 */
export const reminderSyncService = {
  /**
   * Initialize background sync service
   */
  initBackgroundSync: async (): Promise<void> => {
    try {
      console.log('Initializing background sync service');
      // Implementation depends on the specific background fetch capabilities
      // of the platform and requirements
    } catch (error) {
      console.error('Error initializing background sync:', error);
    }
  },
  
  /**
   * Sync reminders if device is connected to the internet
   */
  syncIfConnected: async (): Promise<boolean> => {
    try {
      // Check connectivity
      const connected = await isConnected();
      
      if (!connected) {
        console.log('Device is offline, skipping sync');
        return false;
      }
      
      return await reminderSyncService.syncReminders();
    } catch (error) {
      console.error('Error in syncIfConnected:', error);
      return false;
    }
  },
  
  /**
   * Sync all reminders in the sync queue
   * This is implemented in reminderService to avoid circular dependencies
   */
  syncReminders: async (): Promise<boolean> => {
    // This will be called from reminderService
    console.log('syncReminders called from reminderSyncService - delegating to reminderService');
    
    // The actual implementation is in reminderService.syncReminders()
    // to avoid circular dependencies
    return false;
  },
  
  /**
   * Get sync statistics
   */
  getSyncStats: async (): Promise<{
    pendingCount: number;
  }> => {
    try {
      const syncQueue = await getSyncQueue();
      
      return {
        pendingCount: syncQueue.length
      };
    } catch (error) {
      console.error('Error getting sync stats:', error);
      return { pendingCount: 0 };
    }
  },
  
  /**
   * Reset all synchronization data
   */
  resetSyncStatus: async (): Promise<void> => {
    try {
      // Clear the sync queue
      await clearSyncQueue();
      console.log('Sync status reset');
    } catch (error) {
      console.error('Error resetting sync status:', error);
    }
  },
  
  /**
   * Get reminders that need to be synced with Supabase
   */
  getPendingReminders: async (): Promise<Reminder[]> => {
    try {
      // Get the sync queue
      const syncQueue = await getSyncQueue();
      
      if (syncQueue.length === 0) {
        return [];
      }
      
      // Get all local reminders
      const allReminders = await getLocalReminders();
      
      // Filter to only those in the sync queue
      const pendingReminders = allReminders.filter(reminder => 
        syncQueue.includes(reminder.id)
      );
      
      console.log(`Found ${pendingReminders.length} reminders to sync`);
      return pendingReminders;
    } catch (error) {
      console.error('Error getting pending reminders:', error);
      return [];
    }
  }
};

/**
 * Helper: Check if there are any pending reminders to sync
 */
async function hasPendingReminders(): Promise<boolean> {
  try {
    const pendingReminders = await reminderSyncService.getPendingReminders();
    return pendingReminders.length > 0;
  } catch (error) {
    console.error('Error checking for pending reminders:', error);
    return false;
  }
}

/**
 * Helper: Sync all pending reminders to Supabase
 */
async function syncPendingReminders(): Promise<boolean> {
  try {
    // First check if user is authenticated
    const isAuthenticated = await authService.isAuthenticated();
    if (!isAuthenticated) {
      console.log('User not authenticated, skipping sync');
      return false;
    }
    
    // Get user info
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user found, skipping sync');
      return false;
    }
    
    // Get all pending reminders
    const pendingReminders = await reminderSyncService.getPendingReminders();
    if (pendingReminders.length === 0) {
      console.log('No pending reminders to sync');
      return true;
    }
    
    console.log(`Syncing ${pendingReminders.length} reminders to Supabase`);
    
    // Convert to Supabase format and sync
    const reminderData = pendingReminders.map(reminder => ({
      id: reminder.id,
      user_id: user.id,
      medicine_name: reminder.medicineName,
      dosage: reminder.dosage,
      dose_type: reminder.doseType,
      illness_type: reminder.illnessType,
      frequency: JSON.stringify(reminder.frequency),
      start_date: reminder.startDate,
      end_date: reminder.endDate,
      times: JSON.stringify(reminder.times),
      is_active: reminder.isActive,
      notification_settings: JSON.stringify(reminder.notificationSettings),
      doses: JSON.stringify(reminder.doses),
      notifications: JSON.stringify(reminder.notifications),
      created_at: reminder.lastSyncAttempt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    // Upsert the reminders one by one to ensure they all get processed
    let successCount = 0;
    
    for (const reminderItem of reminderData) {
      try {
        const { error } = await supabase
          .from('reminders')
          .upsert(reminderItem, { onConflict: 'id' });
          
        if (error) {
          console.error(`Error syncing reminder ${reminderItem.id} to Supabase:`, error);
          
          // Mark reminder as error
          const reminder = pendingReminders.find((r: Reminder) => r.id === reminderItem.id);
          if (reminder) {
            await saveReminderToLocalStorage({
              ...reminder,
              syncStatus: 'error',
              lastSyncAttempt: new Date().toISOString(),
              syncError: error.message
            });
          }
        } else {
          // Mark reminder as synced
          const reminder = pendingReminders.find((r: Reminder) => r.id === reminderItem.id);
          if (reminder) {
            await saveReminderToLocalStorage({
              ...reminder,
              syncStatus: 'synced',
              lastSyncAttempt: new Date().toISOString(),
              syncError: undefined
            });
            successCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing reminder ${reminderItem.id}:`, error);
      }
    }
    
    console.log(`Successfully synced ${successCount} of ${pendingReminders.length} reminders`);
    return successCount > 0;
  } catch (error) {
    console.error('Error in syncPendingReminders:', error);
    return false;
  } finally {
    // Update last sync timestamp for fallback mechanism
    await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS + '_last_sync', new Date().toISOString());
  }
}

/**
 * Helper function to get reminders from local storage
 */
async function getLocalReminders(): Promise<Reminder[]> {
  try {
    // Get from AsyncStorage
    const storedReminders = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS);
    
    if (!storedReminders) {
      return [];
    }
    
    return JSON.parse(storedReminders);
  } catch (error) {
    console.error('Error getting local reminders:', error);
    return [];
  }
}

/**
 * Helper: Save a single reminder to local storage
 */
async function saveReminderToLocalStorage(reminder: Reminder): Promise<boolean> {
  try {
    // Get all existing reminders
    const allReminders = await getLocalReminders();
    
    // Find and replace the updated reminder, or add it if not found
    const index = allReminders.findIndex(r => r.id === reminder.id);
    
    if (index >= 0) {
      allReminders[index] = reminder;
    } else {
      allReminders.push(reminder);
    }
    
    // Save back to local storage
    await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(allReminders));
    return true;
  } catch (error) {
    console.error('Error saving reminder to local storage:', error);
    return false;
  }
} 