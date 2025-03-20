import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values'; // Required for uuid to work properly in React Native
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import medicineHistoryLocalService to avoid dynamic import
import { medicineHistoryLocalService } from './medicineHistoryLocalService';

// Create a single supabase client for interacting with your database
const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export interface MedicineHistoryItem {
  id: string;
  user_id: string;
  medicine_name: string;
  language: string;
  response_text: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  identified_language: string | null;
  has_reminder: boolean;
  reminder_id: string | null;
  notes: string | null;
  metadata: any | null;
}

// Helper function to store authentication credentials for re-authentication
export const storeAuthCredentials = async (email: string, password: string) => {
  try {
    await AsyncStorage.setItem('auth_email', email);
    await AsyncStorage.setItem('auth_password', password);
    console.log('Auth credentials stored for future session recovery');
  } catch (error) {
    console.error('Error storing auth credentials:', error);
  }
};

// Helper function to verify session
export const verifySession = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    const hasSession = !!data?.session?.access_token;
    console.log(`Session verification: ${hasSession ? 'Valid ✅' : 'Invalid ❌'}`);
    return hasSession;
  } catch (error) {
    console.error('Error verifying session:', error);
    return false;
  }
};

/**
 * Helper function to check if a user is authenticated in a safe way
 * @returns {Promise<{isAuthenticated: boolean, userId: string}>}
 */
async function checkAuthStatus() {
  try {
    // Get session first
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (sessionData?.session?.user?.id) {
      console.log('Found valid user session ✅');
      return { 
        isAuthenticated: true, 
        userId: sessionData.session.user.id
      };
    }
    
    // Try to refresh token
    console.log('No valid session, attempting to refresh token...');
    
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (!refreshError && refreshData?.session?.user?.id) {
        console.log('Session refresh successful ✅');
        return {
          isAuthenticated: true,
          userId: refreshData.session.user.id
        };
      }
      
      if (refreshError) {
        console.log('Session refresh failed:', refreshError.message);
      }
    } catch (refreshException) {
      console.log('Exception during session refresh:', refreshException);
    }
    
    // Try automatic re-authentication if we have stored credentials
    console.log('Attempting automatic re-authentication...');
    try {
      const storedEmail = await AsyncStorage.getItem('auth_email');
      const storedPassword = await AsyncStorage.getItem('auth_password');
      
      if (storedEmail && storedPassword) {
        console.log('Found stored credentials, attempting re-login');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: storedEmail,
          password: storedPassword
        });
        
        if (!signInError && signInData?.user) {
          console.log('Re-authenticated successfully ✅');
          
          // Save newly created session to storage to ensure it persists
          await AsyncStorage.setItem(
            'supabase.auth.token', 
            JSON.stringify(signInData.session)
          );
          
          return {
            isAuthenticated: true,
            userId: signInData.user.id
          };
        } else if (signInError) {
          console.log('Re-authentication failed:', signInError.message);
        }
      } else {
        console.log('No stored credentials found for automatic login');
      }
    } catch (authError) {
      console.log('Error during re-authentication:', authError);
    }
    
    // Final fallback: try getUser
    console.log('Trying getUser as last resort...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (!userError && userData?.user?.id) {
      console.log('Found user via getUser() ✅');
      return {
        isAuthenticated: true,
        userId: userData.user.id
      };
    }
    
    console.log('User authentication failed completely ❌');
    return { isAuthenticated: false, userId: 'local-user' };
  } catch (error) {
    console.log('Error checking auth status:', error);
    return { isAuthenticated: false, userId: 'local-user' };
  }
}

export const medicineHistoryService = {
  async saveMedicineHistory(
    medicineName: string,
    responseText: string,
    imageUrl: string | null = null,
    language: string = 'en',
    identifiedLanguage: string | null = null,
    hasReminder: boolean = false,
    reminderId: string | null = null,
    notes: string | null = null,
    metadata: any | null = null
  ): Promise<MedicineHistoryItem | null> {
    try {
      // Use our safer auth check method
      const { isAuthenticated, userId } = await checkAuthStatus();
      
      // Always generate a new UUID for the item
      const itemId = uuidv4();
      const now = new Date().toISOString();
      
      if (!isAuthenticated) {
        console.log('User not authenticated, saving medicine locally only');
        // Return a locally generated item with same structure as Supabase
        return {
          id: itemId,
          user_id: 'local-user', // Use 'local-user' for local storage only
          medicine_name: medicineName,
          language: language,
          image_url: imageUrl,
          response_text: responseText,
          identified_language: identifiedLanguage,
          has_reminder: hasReminder,
          reminder_id: reminderId,
          notes: notes,
          metadata: metadata,
          created_at: now,
          updated_at: now
        };
      }
      
      // If authenticated, save to Supabase
      console.log('User authenticated, saving to Supabase');
      
      const { data, error } = await supabase
        .from('medicine_history')
        .insert({
          id: itemId, // Use same ID as we'll use locally
          user_id: userId,
          medicine_name: medicineName,
          language: language,
          image_url: imageUrl,
          response_text: responseText,
          identified_language: identifiedLanguage,
          has_reminder: hasReminder,
          reminder_id: reminderId,
          notes: notes,
          metadata: metadata,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error saving medicine history to Supabase:', error);
        // If Supabase save fails, return a local item
        return {
          id: itemId,
          user_id: 'local-user',
          medicine_name: medicineName,
          language: language,
          image_url: imageUrl,
          response_text: responseText,
          identified_language: identifiedLanguage,
          has_reminder: hasReminder,
          reminder_id: reminderId,
          notes: notes,
          metadata: metadata,
          created_at: now,
          updated_at: now
        };
      }
      
      return data as MedicineHistoryItem;
    } catch (error) {
      console.error('Exception saving medicine history:', error);
      // In case of errors, still create a local item
      const itemId = uuidv4();
      const now = new Date().toISOString();
      
      return {
        id: itemId,
        user_id: 'local-user',
        medicine_name: medicineName,
        language: language,
        image_url: imageUrl,
        response_text: responseText,
        identified_language: identifiedLanguage,
        has_reminder: hasReminder,
        reminder_id: reminderId,
        notes: notes,
        metadata: metadata,
        created_at: now,
        updated_at: now
      };
    }
  },
  
  async getMedicineHistory(): Promise<MedicineHistoryItem[]> {
    try {
      console.log('Fetching medicine history from Supabase...');
      
      // Check auth status just to verify authentication
      const { isAuthenticated, userId } = await checkAuthStatus();
      
      if (!isAuthenticated) {
        console.log('User not authenticated, skipping Supabase query');
        return [];
      }
      
      // IMPORTANT: Query all records first, without user filtering
      // This avoids the UUID error by not using the user_id filter at all
      console.log('Querying all medicine_history records');
      
      // First query without any user_id filter
      const { data, error } = await supabase
        .from('medicine_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching medicine history:', error);
        return [];
      }
      
      if (!data || data.length === 0) {
        console.log('No medicine history records found in Supabase');
        return [];
      }
      
      console.log(`Successfully fetched ${data.length} medicine records from Supabase`);
      return data as MedicineHistoryItem[];
    } catch (error) {
      console.error('Exception fetching medicine history:', error);
      return [];
    }
  },
  
  async getMedicineHistoryById(id: string): Promise<MedicineHistoryItem | null> {
    try {
      // Use our safer auth check method
      const { isAuthenticated } = await checkAuthStatus();
      
      if (!isAuthenticated) {
        console.log('User not authenticated, cannot fetch from Supabase');
        return null;
      }
      
      const { data, error } = await supabase
        .from('medicine_history')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        console.error('Error fetching medicine history item:', error);
        return null;
      }
      
      return data as MedicineHistoryItem;
    } catch (error) {
      console.error('Exception fetching medicine history item:', error);
      return null;
    }
  },
  
  async deleteMedicineHistory(id: string): Promise<boolean> {
    try {
      // Use our safer auth check method
      const { isAuthenticated } = await checkAuthStatus();
      
      if (!isAuthenticated) {
        console.log('User not authenticated, cannot delete from Supabase');
        return false;
      }
      
      const { error } = await supabase
        .from('medicine_history')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Error deleting medicine history:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception deleting medicine history:', error);
      return false;
    }
  },
  
  async searchMedicineHistory(query: string): Promise<MedicineHistoryItem[]> {
    try {
      // Use our safer auth check method
      const { isAuthenticated, userId } = await checkAuthStatus();
      
      if (!isAuthenticated) {
        console.log('User not authenticated, cannot search Supabase');
        return [];
      }
      
      const { data, error } = await supabase
        .from('medicine_history')
        .select('*')
        .eq('user_id', userId)
        .ilike('medicine_name', `%${query}%`)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error searching medicine history:', error);
        return [];
      }
      
      return data as MedicineHistoryItem[];
    } catch (error) {
      console.error('Exception searching medicine history:', error);
      return [];
    }
  },
  
  async updateMedicineHistory(item: MedicineHistoryItem): Promise<boolean> {
    try {
      // Use our safer auth check method
      const { isAuthenticated, userId } = await checkAuthStatus();
      
      if (!isAuthenticated) {
        console.log('User not authenticated, cannot update in Supabase');
        // For unauthenticated users, consider it successful since we'll save locally elsewhere
        return true;
      }
      
      // Ensure the item belongs to the current user
      if (item.user_id !== userId && item.user_id !== 'local-user') {
        console.error('Cannot update item that does not belong to current user');
        return false;
      }
      
      // Update in Supabase
      const { error } = await supabase
        .from('medicine_history')
        .update({
          medicine_name: item.medicine_name,
          response_text: item.response_text,
          language: item.language,
          image_url: item.image_url,
          identified_language: item.identified_language,
          has_reminder: item.has_reminder,
          reminder_id: item.reminder_id,
          notes: item.notes,
          metadata: item.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
        
      if (error) {
        console.error('Error updating medicine history:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception updating medicine history:', error);
      return false;
    }
  },
  
  /**
   * Sync medicine history data between local storage and Supabase
   * Call this function when the app starts or when connectivity is restored
   * @param {boolean} retry - Whether this is a retry attempt 
   */
  async syncMedicineHistory(retry = false): Promise<{ success: boolean, syncedCount: number }> {
    try {
      console.log(`${retry ? 'Retrying' : 'Starting'} medicine history sync process`);
      
      // Explicitly check login status first
      const loggedIn = await verifySession();
      if (!loggedIn) {
        console.log('Direct login check failed - user is not authenticated');
        
        // If this is not already a retry, try once more after a short delay
        if (!retry) {
          console.log('Scheduling sync retry in 2 seconds due to login check failure...');
          return new Promise((resolve) => {
            setTimeout(async () => {
              const retryResult = await this.syncMedicineHistory(true);
              resolve(retryResult);
            }, 2000);
          });
        }
        
        return { success: false, syncedCount: 0 };
      }
      
      // Continue with our safer auth check if the direct login check passed
      const { isAuthenticated, userId } = await checkAuthStatus();
      
      if (!isAuthenticated) {
        console.log('User not authenticated, skipping medicine history sync');
        
        // If this is not already a retry, try once more after a short delay
        // This helps with cases where auth state is still being established
        if (!retry) {
          console.log('Scheduling sync retry in 2 seconds...');
          return new Promise((resolve) => {
            setTimeout(async () => {
              const retryResult = await this.syncMedicineHistory(true);
              resolve(retryResult);
            }, 2000); // Wait 2 seconds before retrying
          });
        }
        
        return { success: false, syncedCount: 0 };
      }
      
      console.log(`Authenticated as user: ${userId.substring(0, 8)}...`);
      
      // 1. First get all existing remote items
      const { data: remoteItems, error: remoteError } = await supabase
        .from('medicine_history')
        .select('*')
        .eq('user_id', userId); // Only get items for this user
        
      if (remoteError) {
        console.error('Error fetching remote medicine history:', remoteError);
        return { success: false, syncedCount: 0 };
      }
      
      const remoteCount = remoteItems?.length || 0;
      console.log(`Found ${remoteCount} existing items in Supabase`);
      
      // 2. Get local medicine history
      const localItems = await medicineHistoryLocalService.getMedicineHistory();
      
      if (localItems.length === 0) {
        console.log('No local medicine history to sync');
        return { success: true, syncedCount: 0 };
      }
      
      console.log(`Found ${localItems.length} local medicine history items to check for sync`);
      
      // 3. Find local items that need to be synced to Supabase
      // These are items with user_id='local-user' or items not in remoteItems
      const remoteIds = new Set(remoteItems?.map(item => item.id) || []);
      const itemsToSync = localItems.filter(item => 
        item.user_id === 'local-user' || !remoteIds.has(item.id)
      );
      
      console.log(`Need to sync ${itemsToSync.length} medicine items to Supabase`);
      
      // Create a set of existing medicine names to prevent duplicates
      const existingMedicineNames = new Set(remoteItems?.map(item => 
        item.medicine_name.toLowerCase().trim()
      ) || []);
      
      // 4. Sync each item to Supabase, avoiding duplicates by medicine name
      let syncedCount = 0;
      for (const item of itemsToSync) {
        // Skip items that already exist with the same medicine name (case insensitive)
        const medicineName = item.medicine_name.toLowerCase().trim();
        if (existingMedicineNames.has(medicineName)) {
          console.log(`Skipping duplicate medicine: "${item.medicine_name}"`);
          
          // Still update the local item to mark it as synced with the proper user_id
          await medicineHistoryLocalService.updateMedicineHistory({
            ...item,
            user_id: userId
          });
          continue;
        }
        
        console.log(`Syncing medicine item: ${item.id.substring(0, 8)}...`);
        
        // IMPORTANT: Create a clean copy of the item with a valid UUID for user_id
        const itemToUpload = {
          ...item,
          user_id: userId, // Replace 'local-user' with actual userId
          updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('medicine_history')
          .upsert(itemToUpload);
          
        if (!error) {
          syncedCount++;
          // Update local item to reflect it's been synced
          await medicineHistoryLocalService.updateMedicineHistory({
            ...item,
            user_id: userId
          });
          console.log(`Successfully synced item: ${item.medicine_name}`);
          
          // Add to the set of existing names to prevent duplicates in this session
          existingMedicineNames.add(medicineName);
        } else {
          console.error(`Error syncing medicine ${item.id}:`, error);
        }
      }
      
      console.log(`Successfully synced ${syncedCount} medicine history items`);
      return { success: true, syncedCount };
      
    } catch (error) {
      console.error('Exception in syncMedicineHistory:', error);
      return { success: false, syncedCount: 0 };
    }
  }
};

export default supabase; 