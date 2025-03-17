import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Create a single supabase client for interacting with your database
const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export interface MedicineHistoryItem {
  id: string;
  user_id: string;
  medicine_name: string;
  image_url: string | null;
  response_text: string;
  created_at: string;
}

export const medicineHistoryService = {
  async saveMedicineHistory(
    medicineName: string,
    responseText: string,
    imageUrl: string | null = null
  ): Promise<MedicineHistoryItem | null> {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.error('User not authenticated:', userError);
        return null;
      }
      
      const { data, error } = await supabase
        .from('medicine_history')
        .insert({
          user_id: userData.user.id,
          medicine_name: medicineName,
          image_url: imageUrl,
          response_text: responseText,
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error saving medicine history:', error);
        return null;
      }
      
      return data as MedicineHistoryItem;
    } catch (error) {
      console.error('Exception saving medicine history:', error);
      return null;
    }
  },
  
  async getMedicineHistory(): Promise<MedicineHistoryItem[]> {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.error('User not authenticated:', userError);
        return [];
      }
      
      const { data, error } = await supabase
        .from('medicine_history')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching medicine history:', error);
        return [];
      }
      
      return data as MedicineHistoryItem[];
    } catch (error) {
      console.error('Exception fetching medicine history:', error);
      return [];
    }
  },
  
  async getMedicineHistoryById(id: string): Promise<MedicineHistoryItem | null> {
    try {
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
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.error('User not authenticated:', userError);
        return [];
      }
      
      const { data, error } = await supabase
        .from('medicine_history')
        .select('*')
        .eq('user_id', userData.user.id)
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
  }
};

export default supabase; 