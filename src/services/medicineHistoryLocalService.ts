import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import { MedicineHistoryItem } from './supabase';
import { v4 as uuidv4 } from 'uuid';


export const medicineHistoryLocalService = {
  /**
   * Get all saved medicine history items from local storage
   */
  async getMedicineHistory(): Promise<MedicineHistoryItem[]> {
    try {
      const storedHistory = await AsyncStorage.getItem(STORAGE_KEYS.MEDICINE_HISTORY);
      if (storedHistory) {
        return JSON.parse(storedHistory);
      }
      return [];
    } catch (error) {
      console.error('Error getting local medicine history:', error);
      return [];
    }
  },

  /**
   * Save a medicine history item to local storage
   */
  async saveMedicineHistory(
    medicineName: string,
    responseText: string,
    imageUrl: string | null = null,
    language: string = 'en',
    identifiedLanguage: string | null = null,
    hasReminder: boolean = false,
    reminderId: string | null = null,
    notes: string | null = null,
    metadata: any | null = null,
    userId: string = 'local-user' // Default user ID for local storage
  ): Promise<MedicineHistoryItem | null> {
    try {
      // Get existing history
      const existingHistory = await this.getMedicineHistory();
      
      const now = new Date().toISOString();
      
      // Create new history item
      const newItem: MedicineHistoryItem = {
        id: uuidv4(),
        user_id: userId,
        medicine_name: medicineName,
        language: language,
        response_text: responseText,
        image_url: imageUrl,
        created_at: now,
        updated_at: now,
        identified_language: identifiedLanguage,
        has_reminder: hasReminder,
        reminder_id: reminderId,
        notes: notes,
        metadata: metadata
      };
      
      // Add to existing history
      const updatedHistory = [newItem, ...existingHistory];
      
      // Save back to storage
      await AsyncStorage.setItem(STORAGE_KEYS.MEDICINE_HISTORY, JSON.stringify(updatedHistory));
      
      return newItem;
    } catch (error) {
      console.error('Error saving medicine to local history:', error);
      return null;
    }
  },

  /**
   * Get a specific medicine history item by ID
   */
  async getMedicineHistoryById(id: string): Promise<MedicineHistoryItem | null> {
    try {
      const history = await this.getMedicineHistory();
      const item = history.find(item => item.id === id);
      return item || null;
    } catch (error) {
      console.error('Error getting medicine history item by ID:', error);
      return null;
    }
  },

  /**
   * Delete a medicine history item by ID
   */
  async deleteMedicineHistory(id: string): Promise<boolean> {
    try {
      const history = await this.getMedicineHistory();
      const updatedHistory = history.filter(item => item.id !== id);
      
      // Save back to storage
      await AsyncStorage.setItem(STORAGE_KEYS.MEDICINE_HISTORY, JSON.stringify(updatedHistory));
      
      return true;
    } catch (error) {
      console.error('Error deleting medicine history item:', error);
      return false;
    }
  },

  /**
   * Search for medicine history items by name or description
   */
  async searchMedicineHistory(query: string): Promise<MedicineHistoryItem[]> {
    try {
      const history = await this.getMedicineHistory();
      
      if (!query.trim()) {
        return history;
      }
      
      return history.filter(item => 
        item.medicine_name.toLowerCase().includes(query.toLowerCase()) ||
        item.response_text.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching medicine history:', error);
      return [];
    }
  },

  /**
   * Update a medicine history item in local storage
   */
  async updateMedicineHistory(item: MedicineHistoryItem): Promise<boolean> {
    try {
      const history = await this.getMedicineHistory();
      const index = history.findIndex(i => i.id === item.id);
      
      if (index === -1) {
        console.error('Medicine history item not found:', item.id);
        return false;
      }
      
      // Update the item
      history[index] = {
        ...item,
        updated_at: new Date().toISOString()
      };
      
      // Save back to storage
      await AsyncStorage.setItem(STORAGE_KEYS.MEDICINE_HISTORY, JSON.stringify(history));
      
      return true;
    } catch (error) {
      console.error('Error updating medicine history item:', error);
      return false;
    }
  }
}; 