import supabase from './supabase';
import { Reminder } from '../features/reminders/types/reminder.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import { authService } from './auth.service';

// Keys for backward compatibility
const LEGACY_KEYS = {
  REMINDERS: 'reminders'
};

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
          frequency = typeof item.frequency === 'string' 
            ? JSON.parse(item.frequency) 
            : item.frequency || { type: 'daily' };
        } catch (e) {
          console.error('Error parsing frequency:', e);
          frequency = { type: 'daily' };
        }
        
        try {
          times = typeof item.times === 'string' 
            ? JSON.parse(item.times) 
            : item.times || [];
        } catch (e) {
          console.error('Error parsing times:', e);
          times = [];
        }
        
        try {
          notificationSettings = typeof item.notification_settings === 'string' 
            ? JSON.parse(item.notification_settings) 
            : item.notification_settings || { sound: 'default', vibration: true, snoozeEnabled: false, defaultSnoozeTime: 10 };
        } catch (e) {
          console.error('Error parsing notification_settings:', e);
          notificationSettings = { sound: 'default', vibration: true, snoozeEnabled: false, defaultSnoozeTime: 10 };
        }
        
        try {
          doses = typeof item.doses === 'string' 
            ? JSON.parse(item.doses) 
            : item.doses || [];
        } catch (e) {
          console.error('Error parsing doses:', e);
          doses = [];
        }
        
        try {
          notifications = typeof item.notifications === 'string' 
            ? JSON.parse(item.notifications) 
            : item.notifications || [];
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
          notifications
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
      
      // First check if user is authenticated
      const isAuthenticated = await authService.isAuthenticated();
      console.log('Is user authenticated:', isAuthenticated);
      
      if (!isAuthenticated) {
        // Fallback to local storage for unauthenticated users
        console.log('User not authenticated, saving to local storage only');
        return await saveLocalReminder(reminder);
      }
      
      // Get user info to associate reminder with user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No user found, saving to local storage only');
        return await saveLocalReminder(reminder);
      }
      
      console.log('Saving reminder for user:', user.id);
      
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
      
      // Convert app format to Supabase format
      const reminderData = {
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
        notifications: JSON.stringify(reminder.notifications)
      };
      
      console.log('Converted reminder to Supabase format');
      
      // Make sure to save to local storage first for redundancy
      const localSaveSuccess = await saveLocalReminder(reminder);
      if (!localSaveSuccess) {
        console.error('Failed to save reminder to local storage');
      }
      
      // Upsert the reminder (insert if not exists, update if exists)
      const { error } = await supabase
        .from('reminders')
        .upsert(reminderData, { onConflict: 'id' });
        
      if (error) {
        console.error('Error saving reminder to Supabase:', error);
        // Already saved to local storage above
        return localSaveSuccess;
      }
      
      console.log(`Successfully saved reminder ${reminder.id} to Supabase`);
      return true;
    } catch (error) {
      console.error('Error in saveReminder:', error);
      // Fallback to local storage
      return await saveLocalReminder(reminder);
    }
  },
  
  /**
   * Save multiple reminders to Supabase
   */
  saveReminders: async (reminders: Reminder[]): Promise<boolean> => {
    try {
      console.log(`Saving ${reminders.length} reminders`);
      
      // First check if user is authenticated
      const isAuthenticated = await authService.isAuthenticated();
      console.log('Is user authenticated:', isAuthenticated);
      
      if (!isAuthenticated) {
        // Fallback to local storage for unauthenticated users
        console.log('User not authenticated, saving to local storage only');
        return await saveLocalReminders(reminders);
      }
      
      // Get user info to associate reminders with user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No user found, saving to local storage only');
        return await saveLocalReminders(reminders);
      }
      
      console.log('Saving reminders for user:', user.id);
      
      // Make sure to save to local storage first for redundancy
      await saveLocalReminders(reminders);
      
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
      
      return allSuccessful;
    } catch (error) {
      console.error('Error in saveReminders:', error);
      // Fallback to local storage
      return await saveLocalReminders(reminders);
    }
  },
  
  /**
   * Delete a reminder from Supabase
   */
  deleteReminder: async (reminderId: string): Promise<boolean> => {
    try {
      console.log('Deleting reminder:', reminderId);
      
      // First check if user is authenticated
      const isAuthenticated = await authService.isAuthenticated();
      console.log('Is user authenticated:', isAuthenticated);
      
      if (!isAuthenticated) {
        // Fallback to local storage for unauthenticated users
        console.log('User not authenticated, deleting from local storage only');
        return await deleteLocalReminder(reminderId);
      }
      
      // Delete from local storage first for redundancy
      await deleteLocalReminder(reminderId);
      
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
      // Fallback to local storage
      return await deleteLocalReminder(reminderId);
    }
  },
  
  /**
   * Sync local reminders with Supabase
   */
  syncReminders: async (): Promise<boolean> => {
    try {
      console.log('Syncing reminders...');
      
      // Get local reminders
      const localReminders = await getLocalReminders();
      
      if (localReminders.length === 0) {
        console.log('No local reminders to sync');
        return true;
      }
      
      // Check if user is authenticated
      const isAuthenticated = await authService.isAuthenticated();
      
      if (!isAuthenticated) {
        console.log('User not authenticated, skipping sync');
        return false;
      }
      
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('User not found, skipping sync');
        return false;
      }
      
      console.log(`Syncing ${localReminders.length} local reminders to Supabase for user ${user.id}`);
      
      return await syncLocalRemindersToSupabase(localReminders, user.id);
    } catch (error) {
      console.error('Error in syncReminders:', error);
      return false;
    }
  }
};

/**
 * Helper function to sync local reminders to Supabase
 */
async function syncLocalRemindersToSupabase(localReminders: Reminder[], userId: string): Promise<boolean> {
  try {
    // Convert app format to Supabase format
    const reminderData = localReminders.map(reminder => ({
      id: reminder.id,
      user_id: userId,
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
      notifications: JSON.stringify(reminder.notifications)
    }));
    
    console.log(`Prepared ${reminderData.length} reminders for sync`);
    
    // Upsert the reminders (insert if not exists, update if exists)
    const { error } = await supabase
      .from('reminders')
      .upsert(reminderData, { onConflict: 'id' });
      
    if (error) {
      console.error('Error syncing reminders to Supabase:', error);
      return false;
    }
    
    console.log(`Successfully synced ${localReminders.length} reminders to Supabase`);
    return true;
  } catch (error) {
    console.error('Error in syncLocalRemindersToSupabase:', error);
    return false;
  }
}

/**
 * Helper functions for local storage
 */
async function getLocalReminders(): Promise<Reminder[]> {
  try {
    console.log('Getting reminders from local storage');
    
    // Try the primary storage key first
    let savedReminders = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS);
    
    // If not found, try the legacy key
    if (!savedReminders) {
      console.log('No reminders found with new key, trying legacy key');
      savedReminders = await AsyncStorage.getItem(LEGACY_KEYS.REMINDERS);
      
      // If found in legacy, migrate it
      if (savedReminders) {
        console.log('Found reminders in legacy storage, migrating...');
        await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, savedReminders);
        await AsyncStorage.removeItem(LEGACY_KEYS.REMINDERS);
        console.log('Migrated reminders from legacy key to new key');
      }
    }
    
    if (savedReminders) {
      const parsed = JSON.parse(savedReminders);
      console.log(`Found ${parsed.length} reminders in local storage`);
      return parsed;
    }
    
    console.log('No reminders found in local storage');
    return [];
  } catch (error) {
    console.error('Error getting local reminders:', error);
    return [];
  }
}

async function saveLocalReminders(reminders: Reminder[]): Promise<boolean> {
  try {
    console.log(`Saving ${reminders.length} reminders to local storage`);
    await AsyncStorage.setItem(
      STORAGE_KEYS.REMINDERS,
      JSON.stringify(reminders)
    );
    console.log('Successfully saved reminders to local storage');
    return true;
  } catch (error) {
    console.error('Error saving local reminders:', error);
    return false;
  }
}

async function saveLocalReminder(reminder: Reminder): Promise<boolean> {
  try {
    console.log(`Saving reminder ${reminder.id} to local storage`);
    
    // Get existing reminders
    const reminders = await getLocalReminders();
    
    // Find if the reminder already exists
    const existingIndex = reminders.findIndex(r => r.id === reminder.id);
    
    if (existingIndex >= 0) {
      // Update existing reminder
      console.log('Updating existing reminder in local storage');
      reminders[existingIndex] = reminder;
    } else {
      // Add new reminder
      console.log('Adding new reminder to local storage');
      reminders.push(reminder);
    }
    
    // Save updated reminders
    return await saveLocalReminders(reminders);
  } catch (error) {
    console.error('Error saving local reminder:', error);
    return false;
  }
}

async function deleteLocalReminder(reminderId: string): Promise<boolean> {
  try {
    console.log(`Deleting reminder ${reminderId} from local storage`);
    
    // Get existing reminders
    const reminders = await getLocalReminders();
    
    // Filter out the reminder to delete
    const updatedReminders = reminders.filter(r => r.id !== reminderId);
    
    console.log(`Filtered ${reminders.length} reminders to ${updatedReminders.length}`);
    
    // Save updated reminders
    return await saveLocalReminders(updatedReminders);
  } catch (error) {
    console.error('Error deleting local reminder:', error);
    return false;
  }
} 