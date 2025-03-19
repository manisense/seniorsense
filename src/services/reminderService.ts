import supabase from './supabase';
import { Reminder } from '../features/reminders/types/reminder.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import { authService } from './auth.service';
import { reminderSyncService } from './reminderSyncService';
import { isConnected } from '../utils/networkUtils';
import {
  addToSyncQueue,
  removeFromSyncQueue,
  getSyncQueue,
  clearSyncQueue
} from './syncQueueService';
import { storageService } from './storage/storage.service';
import { Session } from '@supabase/supabase-js';

// Constants for storage keys from auth.service.ts
const SESSION_STORAGE_KEY = 'supabase.auth.session';

// Keys for backward compatibility
const LEGACY_KEYS = {
  REMINDERS: 'reminders'
};

// Function to get auth context without hooks
// We need this because services can't use hooks directly
let authContextInstance: any = null;
export const setAuthContextInstance = (instance: any) => {
  authContextInstance = instance;
};

/**
 * Validates if a string is a valid UUID
 */
function isValidUUID(str: string): boolean {
  // UUID v4 regex pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(str);
}

/**
 * Generates a new UUID v4
 */
function generateUUID(): string {
  // Simple UUID v4 generation function
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Helper to safely parse JSON fields from Supabase
 * Handles the scenario where Supabase might return stringified JSON or already parsed objects
 */
function safeParseJson(value: any) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Already an object/array, no need to parse
  if (typeof value === 'object') {
    return value;
  }
  
  // Try to parse string as JSON
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      console.log('Value that failed parsing:', value);
      return value; // Return the original string if parsing fails
    }
  }
  
  // Return as is for other types
  return value;
}

/**
 * Helper to safely stringify JSON fields for saving to Supabase
 * Handles the case where the value might already be a string
 */
function safeStringifyJson(value: any) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Already a string, check if it's already JSON
  if (typeof value === 'string') {
    try {
      // Try parsing to see if it's valid JSON
      JSON.parse(value);
      // If parsing succeeds, it's already a JSON string
      return value;
    } catch (error) {
      // Not a JSON string, so stringify it
      return JSON.stringify(value);
    }
  }
  
  // Object or other type, stringify it
  return JSON.stringify(value);
}

/**
 * Service for managing reminders using Supabase
 */
export const reminderService = {
  /**
   * Get all reminders for the current user
   */
  getReminders: async (): Promise<Reminder[]> => {
    try {
      console.log('Getting reminders...');
      
      // First check if user is authenticated
      const isAuthenticated = await authService.isAuthenticated();
      console.log('Is user authenticated:', isAuthenticated);
      
      if (!isAuthenticated) {
        // Fallback to local storage for unauthenticated users
        console.log('User not authenticated, getting reminders from local storage');
        return await getLocalReminders();
      }
      
      // Check connectivity before trying to fetch from Supabase
      const connected = await isConnected();
      if (!connected) {
        console.log('Device is offline, getting reminders from local storage only');
        return await getLocalReminders();
      }
      
      // Get user info to associate reminders with user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No user found, getting reminders from local storage');
        return await getLocalReminders();
      }
      
      console.log('Getting reminders for user:', user.id);
      
      // Get reminders from Supabase
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching reminders from Supabase:', error);
        // Fallback to local storage
        return await getLocalReminders();
      }
      
      console.log(`Found ${data?.length || 0} reminders in Supabase`);
      
      if (!data || data.length === 0) {
        // If no reminders in Supabase, sync local reminders if they exist
        const localReminders = await getLocalReminders();
        if (localReminders.length > 0) {
          console.log(`Found ${localReminders.length} local reminders, syncing to Supabase...`);
          await syncLocalRemindersToSupabase(localReminders, user.id);
          return localReminders;
        }
        return [];
      }
      
      // Convert Supabase data format to app format
      const reminders = data ? data.map(item => {
        // Ensure proper parsing of JSON fields
        let frequency, times, notificationSettings, doses, notifications;
        
        try {
          frequency = safeParseJson(item.frequency);
        } catch (e) {
          console.error('Error parsing frequency:', e);
          frequency = { type: 'daily' };
        }
        
        try {
          times = safeParseJson(item.times);
        } catch (e) {
          console.error('Error parsing times:', e);
          times = [];
        }
        
        try {
          notificationSettings = safeParseJson(item.notification_settings);
        } catch (e) {
          console.error('Error parsing notification_settings:', e);
          notificationSettings = { sound: 'default', vibration: true, snoozeEnabled: false, defaultSnoozeTime: 10 };
        }
        
        try {
          doses = safeParseJson(item.doses);
        } catch (e) {
          console.error('Error parsing doses:', e);
          doses = [];
        }
        
        try {
          notifications = safeParseJson(item.notifications);
        } catch (e) {
          console.error('Error parsing notifications:', e);
          notifications = [];
        }
        
        return {
          id: item.id,
          medicineName: item.medicine_name,
          dosage: item.dosage,
          doseType: item.dose_type,
          illnessType: item.illness_type,
          frequency,
          startDate: item.start_date,
          endDate: item.end_date,
          times,
          isActive: item.is_active,
          notificationSettings,
          doses,
          notifications,
          syncStatus: 'synced' as const,
          lastSyncAttempt: new Date().toISOString()
        };
      }) : [];
      
      console.log(`Successfully converted ${reminders.length} reminders from Supabase format`);
      
      // Also update local storage as a backup
      await saveLocalReminders(reminders);
      
      return reminders;
    } catch (error) {
      console.error('Error in getReminders:', error);
      // Fallback to local storage
      return await getLocalReminders();
    }
  },
  
  /**
   * Save a reminder to Supabase
   */
  saveReminder: async (reminder: Reminder): Promise<boolean> => {
    try {
      console.log('Saving reminder:', reminder.id, reminder.medicineName);
      
      // Always save to local storage first for redundancy
      const localSaveSuccess = await saveLocalReminder({
        ...reminder,
        lastSyncAttempt: new Date().toISOString()
      });
      
      if (!localSaveSuccess) {
        console.error('Failed to save reminder to local storage');
        return false;
      }
      
      // Check connectivity
      const connected = await isConnected();
      
      // First check if user is authenticated
      const isAuthenticated = await authService.isAuthenticated();
      console.log('Is user authenticated:', isAuthenticated);
      
      if (!isAuthenticated || !connected) {
        // Mark for sync and return
        await addToSyncQueue(reminder.id);
        
        if (!connected) {
          console.log('Device is offline, reminder marked for sync');
        } else {
          console.log('User not authenticated, reminder marked for sync');
        }
        
        return localSaveSuccess;
      }
      
      // Verify and refresh session if needed using auth context
      if (authContextInstance?.verifySession) {
        console.log('Verifying session before saving reminder');
        const sessionValid = await authContextInstance.verifySession();
        if (!sessionValid) {
          console.log('Session verification failed, marking reminder for sync');
          await addToSyncQueue(reminder.id);
          return localSaveSuccess;
        }
        console.log('Session verified successfully');
      }
      
      // Get user info to associate reminder with user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Authentication error when getting user:', userError);
        
        // Try one more time to refresh the session
        try {
          console.log('Attempting to refresh session after user error...');
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData.session) {
            // Try again to get the user with refreshed session
            const { data: retryUserData, error: retryUserError } = await supabase.auth.getUser();
            if (retryUserError || !retryUserData.user) {
              console.error('Still unable to get user after refresh:', retryUserError);
              
              // Mark for sync and return
              await addToSyncQueue(reminder.id);
              return localSaveSuccess;
            }
            console.log('Successfully got user after refresh');
          } else {
            // Mark for sync and return
            await addToSyncQueue(reminder.id);
            return localSaveSuccess;
          }
        } catch (refreshCatchError) {
          console.error('Exception during session refresh after user error:', refreshCatchError);
          
          // Mark for sync and return
          await addToSyncQueue(reminder.id);
          return localSaveSuccess;
        }
      }
      
      // Try getting user again after potential refresh
      const { data: finalUserData } = await supabase.auth.getUser();
      const finalUser = finalUserData.user;
      
      if (!finalUser) {
        console.error('No user found after all auth attempts');
        return false;
      }
      
      console.log('Saving reminder for user:', finalUser.id);
      
      // Validate reminder data
      if (!reminder.medicineName) {
        console.error('Cannot save reminder - missing medicine name');
        return false;
      }
      
      if (!reminder.times || reminder.times.length === 0) {
        console.error('Cannot save reminder - no times specified');
        return false;
      }
      
      // Log notification settings
      console.log('Notification settings:', JSON.stringify(reminder.notificationSettings));
      
      // Set up timestamps for created_at and updated_at if they don't exist
      const now = new Date().toISOString();
      
      // Convert app format to Supabase format
      const reminderData = {
        id: isValidUUID(reminder.id) ? reminder.id : generateUUID(),
        user_id: finalUser.id,
        medicine_name: reminder.medicineName,
        dosage: reminder.dosage || '',
        dose_type: reminder.doseType || '',
        illness_type: reminder.illnessType || '',
        frequency: safeStringifyJson(reminder.frequency || { type: 'daily' }),
        start_date: reminder.startDate || now,
        end_date: reminder.endDate || now,
        times: safeStringifyJson(reminder.times || []),
        is_active: reminder.isActive !== undefined ? reminder.isActive : true,
        notification_settings: safeStringifyJson(reminder.notificationSettings || { 
          sound: 'default', 
          vibration: true, 
          snoozeEnabled: false, 
          defaultSnoozeTime: 10 
        }),
        doses: safeStringifyJson(reminder.doses || []),
        notifications: safeStringifyJson(reminder.notifications || []),
        created_at: reminder.created_at || now,  // Use existing timestamp if available
        updated_at: now  // Always update the updated_at timestamp
      };
      
      console.log('Converted reminder to Supabase format');
      console.log('Reminder data structure:', Object.keys(reminderData).join(', '));
      console.log('Using ID format:', reminderData.id);
      
      // Save to Supabase
      const { error } = await supabase
        .from('reminders')
        .upsert(reminderData, { onConflict: 'id' });
        
      if (error) {
        console.error('Error saving reminder to Supabase:', error);
        
        // Check for specific errors and log them
        if (error.message.includes('does not exist')) {
          console.error('Column does not exist error. Please check your Supabase table structure.');
          console.log('Expected structure:', Object.keys(reminderData).join(', '));
        } else if (error.message.includes('violates not-null constraint')) {
          console.error('Missing required field. Check that all required fields are provided.');
        } else if (error.message.includes('invalid input syntax')) {
          console.error('Invalid data format. Check data types match Supabase schema.');
        }
        
        // Mark for sync for retry later
        await addToSyncQueue(reminder.id);
        return localSaveSuccess;
      }
      
      // Mark as synced in local storage
      await saveLocalReminder({
        ...reminder,
        syncStatus: 'synced' as const,
        lastSyncAttempt: new Date().toISOString(),
        syncError: undefined,
        updated_at: now
      });
      
      await removeFromSyncQueue([reminder.id]);
      
      console.log(`Successfully saved reminder ${reminder.id} to Supabase`);
      return true;
    } catch (error) {
      console.error('Error in saveReminder:', error);
      // Mark for sync
      await addToSyncQueue(reminder.id);
      return false;
    }
  },
  
  /**
   * Save multiple reminders to Supabase
   */
  saveReminders: async (reminders: Reminder[]): Promise<boolean> => {
    try {
      console.log(`Saving ${reminders.length} reminders`);
      
      // Save to local storage first
      await saveLocalReminders(reminders);
      
      // Check connectivity
      const connected = await isConnected();
      
      // First check if user is authenticated
      const isAuthenticated = await authService.isAuthenticated();
      console.log('Is user authenticated:', isAuthenticated);
      
      if (!isAuthenticated || !connected) {
        // Mark all for sync
        for (const reminder of reminders) {
          await addToSyncQueue(reminder.id);
        }
        
        if (!connected) {
          console.log('Device is offline, reminders marked for sync');
        } else {
          console.log('User not authenticated, reminders marked for sync');
        }
        
        return true;
      }
      
      // Store reference to the service methods to avoid 'this' binding issues
      const saveReminderFn = reminderService.saveReminder;
      
      // Process reminders one by one to ensure they all get saved
      let allSuccessful = true;
      for (const reminder of reminders) {
        const result = await saveReminderFn(reminder);
        if (!result) {
          allSuccessful = false;
        }
      }
      
      // Trigger a sync to ensure everything is properly synced
      await reminderSyncService.syncIfConnected();
      
      return allSuccessful;
    } catch (error) {
      console.error('Error in saveReminders:', error);
      // Mark all for sync
      for (const reminder of reminders) {
        await addToSyncQueue(reminder.id);
      }
      return false;
    }
  },
  
  /**
   * Delete a reminder from Supabase
   */
  deleteReminder: async (reminderId: string): Promise<boolean> => {
    try {
      console.log('Deleting reminder:', reminderId);
      
      // Delete from local storage first for redundancy
      await deleteLocalReminder(reminderId);
      
      // Check connectivity
      const connected = await isConnected();
      
      // Check if user is authenticated
      const isAuthenticated = await authService.isAuthenticated();
      console.log('Is user authenticated:', isAuthenticated);
      
      if (!isAuthenticated || !connected) {
        console.log(
          !connected 
            ? 'Device is offline, reminder deleted from local storage only' 
            : 'User not authenticated, reminder deleted from local storage only'
        );
        return true;
      }
      
      // Delete the reminder from Supabase
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId);
        
      if (error) {
        console.error('Error deleting reminder from Supabase:', error);
        // Already deleted from local storage above
        return true;
      }
      
      console.log(`Successfully deleted reminder ${reminderId} from Supabase`);
      return true;
    } catch (error) {
      console.error('Error in deleteReminder:', error);
      // Already tried to delete from local storage above
      return false;
    }
  },
  
  /**
   * Synchronize reminders with Supabase
   */
  syncReminders: async (): Promise<boolean> => {
    try {
      console.log('Starting reminder sync process');
      
      // Check connectivity
      const connected = await isConnected();
      if (!connected) {
        console.log('Device is offline, skipping sync');
        return false;
      }
      
      // Check authentication
      const isAuthenticated = await authService.isAuthenticated();
      if (!isAuthenticated) {
        console.log('User not authenticated, skipping sync');
        return false;
      }
      
      // Get reminders that need syncing from the queue
      const syncQueue = await getSyncQueue();
      
      if (syncQueue.length === 0) {
        console.log('No reminders to sync');
        return true;
      }
      
      console.log(`Found ${syncQueue.length} reminders to sync`);
      
      // Get all local reminders
      const localReminders = await getLocalReminders();
      
      // Get reminders that need to be synced
      const remindersToSync = localReminders.filter(reminder => 
        syncQueue.includes(reminder.id)
      );
      
      if (remindersToSync.length === 0) {
        console.log('No matching reminders found in local storage');
        // Clear the sync queue as we can't find these reminders
        await clearSyncQueue();
        return false;
      }
      
      console.log(`Found ${remindersToSync.length} reminders to sync in local storage`);
      
      // Track success/failure
      let successCount = 0;
      let failCount = 0;
      
      // Sync each reminder
      for (const reminder of remindersToSync) {
        try {
          console.log(`Syncing reminder: ${reminder.id}`);
          
          // Attempt to save to Supabase
          const success = await saveReminderToSupabase(reminder);
          
          if (success) {
            successCount++;
            
            // Update status
            await saveLocalReminder({
              ...reminder,
              syncStatus: 'synced',
              lastSyncAttempt: new Date().toISOString(),
              syncError: undefined
            });
            
            // Remove from queue
            await removeFromSyncQueue([reminder.id]);
            
            console.log(`Successfully synced reminder: ${reminder.id}`);
          } else {
            failCount++;
            console.error(`Failed to sync reminder: ${reminder.id}`);
            
            // Update status but leave in queue for retry
            await saveLocalReminder({
              ...reminder,
              syncStatus: 'error',
              lastSyncAttempt: new Date().toISOString(),
              syncError: 'Failed to sync with Supabase'
            });
          }
          
          // Small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          failCount++;
          console.error(`Error syncing reminder ${reminder.id}:`, error);
        }
      }
      
      console.log(`Sync complete. Success: ${successCount}, Failed: ${failCount}`);
      
      // Return true if all succeeded, or false if any failed
      return failCount === 0;
    } catch (error) {
      console.error('Error in syncReminders:', error);
      return false;
    }
  },
  
  /**
   * Initialize reminder service and background sync
   */
  initialize: async (): Promise<void> => {
    try {
      // Set up background sync
      await reminderSyncService.initBackgroundSync();
      
      // Trigger initial sync if connected
      await reminderSyncService.syncIfConnected();
      
      console.log('Reminder service initialized');
    } catch (error) {
      console.error('Error initializing reminder service:', error);
    }
  },
  
  /**
   * Get synchronization statistics
   */
  getSyncStats: async (): Promise<{
    total: number;
    pending: number;
    synced: number;
    error: number;
  }> => {
    try {
      const reminders = await getLocalReminders();
      const pendingSync = await getSyncQueue();
      
      return {
        total: reminders.length,
        pending: pendingSync.length,
        synced: reminders.filter(r => r.syncStatus === 'synced').length,
        error: reminders.filter(r => r.syncStatus === 'error').length
      };
    } catch (error) {
      console.error('Error getting sync stats:', error);
      return {
        total: 0,
        pending: 0,
        synced: 0,
        error: 0
      };
    }
  }
};

/**
 * Helper function to sync local reminders to Supabase
 */
async function syncLocalRemindersToSupabase(localReminders: Reminder[], userId: string): Promise<boolean> {
  try {
    // Set up timestamp for all records
    const now = new Date().toISOString();
    
    // Convert app format to Supabase format
    const reminderData = localReminders.map(reminder => ({
      id: isValidUUID(reminder.id) ? reminder.id : generateUUID(),
      user_id: userId,
      medicine_name: reminder.medicineName,
      dosage: reminder.dosage || '',
      dose_type: reminder.doseType || '',
      illness_type: reminder.illnessType || '',
      frequency: safeStringifyJson(reminder.frequency || { type: 'daily' }),
      start_date: reminder.startDate || now,
      end_date: reminder.endDate || now,
      times: safeStringifyJson(reminder.times || []),
      is_active: reminder.isActive !== undefined ? reminder.isActive : true,
      notification_settings: safeStringifyJson(reminder.notificationSettings || { 
        sound: 'default', 
        vibration: true, 
        snoozeEnabled: false, 
        defaultSnoozeTime: 10 
      }),
      doses: safeStringifyJson(reminder.doses || []),
      notifications: safeStringifyJson(reminder.notifications || []),
      created_at: reminder.created_at || now,  // Use existing timestamp if available
      updated_at: now  // Always update the updated_at timestamp
    }));
    
    console.log(`Prepared ${reminderData.length} reminders for sync`);
    
    // Upsert the reminders (insert if not exists, update if exists)
    const { error } = await supabase
      .from('reminders')
      .upsert(reminderData, { onConflict: 'id' });
      
    if (error) {
      console.error('Error syncing reminders to Supabase:', error);
      
      // Provide more detailed error information
      if (error.message.includes('does not exist')) {
        console.error('Column does not exist error. Please check your Supabase table structure.');
        console.log('Expected columns:', Object.keys(reminderData[0]).join(', '));
      } else if (error.message.includes('violates not-null constraint')) {
        console.error('Missing required field. Check that all required fields are provided.');
      } else if (error.message.includes('invalid input syntax')) {
        console.error('Invalid data format. Check data types match Supabase schema.');
      }
      
      return false;
    }
    
    // Update local reminders with synced status
    for (const reminder of localReminders) {
      await saveLocalReminder({
        ...reminder, 
        syncStatus: 'synced' as const,
        lastSyncAttempt: new Date().toISOString()
      });
    }
    
    await removeFromSyncQueue(localReminders.map(r => r.id));
    
    console.log(`Successfully synced ${localReminders.length} reminders to Supabase`);
    return true;
  } catch (error) {
    console.error('Error in syncLocalRemindersToSupabase:', error);
    return false;
  }
}

/**
 * Helper function to get reminders from local storage
 */
async function getLocalReminders(): Promise<Reminder[]> {
  try {
    // Try to get from AsyncStorage
    const storedReminders = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS);
    
    if (!storedReminders) {
      // Try legacy storage key for backward compatibility
      const legacyReminders = await AsyncStorage.getItem(LEGACY_KEYS.REMINDERS);
      
      if (!legacyReminders) {
        return [];
      }
      
      // Migrate legacy reminders to new storage key
      const parsedReminders = JSON.parse(legacyReminders);
      await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, legacyReminders);
      
      // Add syncStatus to migrated reminders
      const updatedReminders = parsedReminders.map((reminder: Reminder) => ({
        ...reminder,
        syncStatus: 'pending_sync' as const,
        lastSyncAttempt: new Date().toISOString()
      }));
      
      await saveLocalReminders(updatedReminders);
      
      return updatedReminders;
    }
    
    return JSON.parse(storedReminders);
  } catch (error) {
    console.error('Error getting local reminders:', error);
    return [];
  }
}

/**
 * Helper function to save reminders to local storage
 */
async function saveLocalReminders(reminders: Reminder[]): Promise<boolean> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
    return true;
  } catch (error) {
    console.error('Error saving reminders to local storage:', error);
    return false;
  }
}

/**
 * Helper function to save a single reminder to local storage
 */
async function saveLocalReminder(reminder: Reminder): Promise<boolean> {
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
    return await saveLocalReminders(allReminders);
  } catch (error) {
    console.error('Error saving reminder to local storage:', error);
    return false;
  }
}

/**
 * Helper function to delete a reminder from local storage
 */
async function deleteLocalReminder(reminderId: string): Promise<boolean> {
  try {
    // Get all reminders
    const allReminders = await getLocalReminders();
    
    // Filter out the one to delete
    const updatedReminders = allReminders.filter(r => r.id !== reminderId);
    
    // Save the filtered list back to storage
    return await saveLocalReminders(updatedReminders);
  } catch (error) {
    console.error('Error deleting reminder from local storage:', error);
    return false;
  }
}

/**
 * Save a reminder directly to Supabase without local storage updates
 * This is used internally by syncReminders to avoid circular dependencies
 */
async function saveReminderToSupabase(reminder: Reminder): Promise<boolean> {
  try {
    console.log('Saving reminder directly to Supabase:', reminder.id);
    
    // Try to get the current session or refresh it if needed
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error when getting session:', sessionError);
      
      // Try to refresh the session anyway
      console.log('Attempting to refresh session after session error...');
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          console.error('Failed to refresh session after session error:', refreshError);
          
          // Additional recovery attempt - try explicitly using stored tokens
          console.log('Attempting recovery using stored session tokens...');
          const storedSession = await storageService.get<Session>(SESSION_STORAGE_KEY);
          
          if (storedSession?.refresh_token) {
            try {
              console.log('Found stored session tokens, attempting to restore session...');
              const { error: setSessionError } = await supabase.auth.setSession({
                access_token: storedSession.access_token,
                refresh_token: storedSession.refresh_token
              });
              
              if (setSessionError) {
                console.error('Failed to set session from stored tokens:', setSessionError);
                // If we still fail, try signing out and back in programmatically
                if (setSessionError.message.includes('Auth session missing')) {
                  console.log('Session completely invalid. User needs to sign out and back in.');
                }
                return false;
              }
              
              console.log('Successfully restored session from stored tokens');
              // Continue with the save operation with the restored session
            } catch (restoreError) {
              console.error('Exception during session token restoration:', restoreError);
              return false;
            }
          } else {
            console.log('No stored session tokens found for recovery');
            return false;
          }
        } else {
          console.log('Session refreshed successfully after session error');
        }
      } catch (refreshCatchError) {
        console.error('Exception during session refresh after session error:', refreshCatchError);
        return false;
      }
    } else if (!sessionData.session) {
      // No session error but session is missing
      console.log('No active session found in getSession response, attempting to refresh...');
      
      // Try up to 3 times to refresh the session
      let refreshAttempts = 0;
      let sessionRefreshed = false;
      
      while (refreshAttempts < 3 && !sessionRefreshed) {
        refreshAttempts++;
        console.log(`Session refresh attempt ${refreshAttempts}...`);
        
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error(`Session refresh error (attempt ${refreshAttempts}):`, refreshError);
            
            // Check for specific error types
            if (refreshError.message.includes('Auth session missing')) {
              console.error('AuthSessionMissingError: Attempting alternative recovery methods');
              
              // Try to recover using stored tokens
              const storedSession = await storageService.get<Session>(SESSION_STORAGE_KEY);
              if (storedSession?.refresh_token) {
                try {
                  console.log('Found stored session tokens, attempting to restore session...');
                  const { error: setSessionError } = await supabase.auth.setSession({
                    access_token: storedSession.access_token,
                    refresh_token: storedSession.refresh_token
                  });
                  
                  if (setSessionError) {
                    console.error('Failed to set session from stored tokens:', setSessionError);
                  } else {
                    console.log('Successfully restored session from stored tokens');
                    sessionRefreshed = true;
                    break;
                  }
                } catch (setSessionError) {
                  console.error('Exception when setting session:', setSessionError);
                }
              }
              
              // If we reach here on the last attempt, session recovery failed
              if (refreshAttempts >= 3) {
                console.error('All session refresh attempts failed. User needs to re-authenticate.');
                return false;
              }
            }
          } else if (refreshData.session) {
            console.log(`Session refreshed successfully on attempt ${refreshAttempts}`);
            sessionRefreshed = true;
            break;
          } else {
            console.error(`No session returned after refresh (attempt ${refreshAttempts})`);
          }
          
          // Small delay between retries
          if (!sessionRefreshed && refreshAttempts < 3) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
        } catch (refreshCatchError) {
          console.error(`Exception during session refresh (attempt ${refreshAttempts}):`, refreshCatchError);
        }
      }
      
      if (!sessionRefreshed) {
        console.error('Failed to refresh session after multiple attempts');
        return false;
      }
    } else {
      console.log('Active session found, continuing with save');
    }
    
    // Get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Authentication error when getting user:', userError);
      
      // Try one more time to refresh the session
      try {
        console.log('Attempting to refresh session after user error...');
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData.session) {
          // Try again to get the user with refreshed session
          const { data: retryUserData, error: retryUserError } = await supabase.auth.getUser();
          if (retryUserError || !retryUserData.user) {
            console.error('Still unable to get user after refresh:', retryUserError);
            return false;
          }
          console.log('Successfully got user after refresh');
        } else {
          return false;
        }
      } catch (refreshCatchError) {
        console.error('Exception during session refresh after user error:', refreshCatchError);
        return false;
      }
    }
    
    // Try getting user again after potential refresh
    const { data: finalUserData } = await supabase.auth.getUser();
    const finalUser = finalUserData.user;
    
    if (!finalUser) {
      console.error('No user found after all auth attempts');
      return false;
    }
    
    // Set up timestamps - ensure they are always present with correct format
    const now = new Date().toISOString();
    
    // Convert app format to Supabase format
    const reminderData = {
      id: isValidUUID(reminder.id) ? reminder.id : generateUUID(),
      user_id: finalUser.id,
      medicine_name: reminder.medicineName,
      dosage: reminder.dosage || '',
      dose_type: reminder.doseType || '',
      illness_type: reminder.illnessType || '',
      frequency: safeStringifyJson(reminder.frequency || { type: 'daily' }),
      start_date: reminder.startDate || now,
      end_date: reminder.endDate || now,
      times: safeStringifyJson(reminder.times || []),
      is_active: reminder.isActive !== undefined ? reminder.isActive : true,
      notification_settings: safeStringifyJson(reminder.notificationSettings || { 
        sound: 'default', 
        vibration: true, 
        snoozeEnabled: false, 
        defaultSnoozeTime: 10 
      }),
      doses: safeStringifyJson(reminder.doses || []),
      notifications: safeStringifyJson(reminder.notifications || []),
      created_at: reminder.created_at || now,  // Use existing timestamp if available
      updated_at: now  // Always update the updated_at timestamp
    };
    
    // Log data being sent to Supabase
    console.log('Saving reminder with data structure:', Object.keys(reminderData).join(', '));
    console.log('Using ID format:', reminderData.id);
    
    // Save to Supabase
    const { error } = await supabase
      .from('reminders')
      .upsert(reminderData, { onConflict: 'id' });
      
    if (error) {
      console.error('Error saving reminder to Supabase:', error);
      
      // Provide more detailed error information
      if (error.message.includes('does not exist')) {
        console.error('Column does not exist error. Please check your Supabase table structure.');
        console.log('Expected columns:', Object.keys(reminderData).join(', '));
      } else if (error.message.includes('violates not-null constraint')) {
        console.error('Missing required field. Check that all required fields are provided.');
      } else if (error.message.includes('invalid input syntax')) {
        console.error('Invalid data format. Check data types match Supabase schema.');
      }
      
      return false;
    }
    
    console.log('Successfully saved reminder directly to Supabase:', reminder.id);
    return true;
  } catch (error) {
    console.error('Error in saveReminderToSupabase:', error);
    return false;
  }
} 