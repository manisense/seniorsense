import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { EmergencyContact } from '../../types';

export const triggerSOS = async (contacts: EmergencyContact[]) => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    const location = await Location.getCurrentPositionAsync({});
    const message = `EMERGENCY: I need help! My location: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
    
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('SMS not available');
    }

    await SMS.sendSMSAsync(
      contacts.map(contact => contact.phone),
      message
    );
  } catch (error) {
    throw error;
  }
};
