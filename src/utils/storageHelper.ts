import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';
import { Reminder } from '../features/reminders/types/reminder.types';

// Keys for backward compatibility
const LEGACY_KEYS = {
  REMINDERS: 'reminders'
};

export const getReminders = async (): Promise<Reminder[]> => {
  try {
    // Try the primary storage key first
    let savedReminders = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS);
    
    // If not found, try the legacy key
    if (!savedReminders) {
      savedReminders = await AsyncStorage.getItem(LEGACY_KEYS.REMINDERS);
      
      // If found in legacy, migrate it
      if (savedReminders) {
        await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, savedReminders);
        await AsyncStorage.removeItem(LEGACY_KEYS.REMINDERS);
        console.log('Migrated reminders from legacy key to new key');
      }
    }
    
    if (savedReminders) {
      return JSON.parse(savedReminders);
    }
    
    return [];
  } catch (error) {
    console.error('Error getting reminders:', error);
    return [];
  }
};

export const saveReminders = async (reminders: Reminder[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.REMINDERS,
      JSON.stringify(reminders)
    );
    return true;
  } catch (error) {
    console.error('Error saving reminders:', error);
    return false;
  }
}; 