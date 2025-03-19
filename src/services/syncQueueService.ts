/**
 * Sync Queue Service
 * Manages a queue of reminders that need to be synced with Supabase
 * This is separate from reminderService and reminderSyncService to avoid circular dependencies
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';

/**
 * Add a reminder ID to the sync queue
 */
export async function addToSyncQueue(reminderId: string): Promise<void> {
  try {
    console.log(`Adding reminder ${reminderId} to sync queue`);
    
    // Get current queue
    const syncQueue = await getSyncQueue();
    
    // Only add if not already in queue
    if (!syncQueue.includes(reminderId)) {
      syncQueue.push(reminderId);
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(syncQueue));
      console.log(`Added reminder ${reminderId} to sync queue`);
    } else {
      console.log(`Reminder ${reminderId} already in sync queue`);
    }
  } catch (error) {
    console.error('Error adding to sync queue:', error);
  }
}

/**
 * Get all reminder IDs in the sync queue
 */
export async function getSyncQueue(): Promise<string[]> {
  try {
    const syncQueue = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
    return syncQueue ? JSON.parse(syncQueue) : [];
  } catch (error) {
    console.error('Error getting sync queue:', error);
    return [];
  }
}

/**
 * Remove reminder IDs from the sync queue
 */
export async function removeFromSyncQueue(reminderIds: string[]): Promise<void> {
  try {
    // Get current queue
    const syncQueue = await getSyncQueue();
    
    // Filter out the provided IDs
    const updatedQueue = syncQueue.filter(id => !reminderIds.includes(id));
    
    // Save updated queue
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(updatedQueue));
    console.log(`Removed ${reminderIds.length} reminders from sync queue`);
  } catch (error) {
    console.error('Error removing from sync queue:', error);
  }
}

/**
 * Check if a reminder ID is in the sync queue
 */
export async function isInSyncQueue(reminderId: string): Promise<boolean> {
  try {
    const syncQueue = await getSyncQueue();
    return syncQueue.includes(reminderId);
  } catch (error) {
    console.error('Error checking sync queue:', error);
    return false;
  }
}

/**
 * Clear the entire sync queue
 */
export async function clearSyncQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([]));
    console.log('Sync queue cleared');
  } catch (error) {
    console.error('Error clearing sync queue:', error);
  }
}

/**
 * Check if there are any items in the sync queue
 */
export async function hasPendingSync(): Promise<boolean> {
  try {
    const syncQueue = await getSyncQueue();
    return syncQueue.length > 0;
  } catch (error) {
    console.error('Error checking for pending sync:', error);
    return false;
  }
} 