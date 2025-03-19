import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/features/profile/constants';

export interface ProfileData {
  id?: string;
  user_id?: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  age?: number;
  blood_type?: string;
  avatar_url?: string;
  medical_conditions?: string[];
  medications?: string[];
  allergies?: string[];
  preferred_notification_time?: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
}

export const profileService = {
  // Get profile from Supabase
  getProfile: async (): Promise<{ data: ProfileData | null, error: Error | null }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (error) {
        throw error;
      }
      
      // Cache profile locally
      if (data) {
        await profileService.cacheProfile(data);
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching profile:', error);
      
      // Try to get from cache
      const cachedProfile = await profileService.getCachedProfile();
      if (cachedProfile) {
        return { data: cachedProfile, error: null };
      }
      
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },
  
  // Update profile in Supabase
  updateProfile: async (profileData: Partial<ProfileData>): Promise<{ data: ProfileData | null, error: Error | null }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // Update cache
      if (data) {
        await profileService.cacheProfile(data);
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },
  
  // Create a profile if it doesn't exist
  ensureProfile: async (user: User): Promise<{ data: ProfileData | null, error: Error | null }> => {
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (existingProfile) {
        return { data: existingProfile, error: null };
      }
      
      // Create profile if it doesn't exist
      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            email: user.email,
          }
        ])
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // Cache the profile
      if (data) {
        await profileService.cacheProfile(data);
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error ensuring profile:', error);
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },
  
  // Cache profile locally
  cacheProfile: async (profileData: ProfileData): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profileData));
    } catch (error) {
      console.error('Error caching profile:', error);
    }
  },
  
  // Get cached profile
  getCachedProfile: async (): Promise<ProfileData | null> => {
    try {
      const profileJson = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      return profileJson ? JSON.parse(profileJson) : null;
    } catch (error) {
      console.error('Error getting cached profile:', error);
      return null;
    }
  }
}; 