import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { Alert, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmergencyContact } from '../../../types';
import { SMSService } from '../../../services/sms/AndroidSmsModule';
import { Platform, PermissionsAndroid } from 'react-native';


const STORAGE_KEY = 'emergency_contacts';
const MAX_CONTACTS = 5;

export const requestPermissions = async () => {
  try {
    const [contactStatus, locationStatus] = await Promise.all([
      Contacts.requestPermissionsAsync(),
      Location.requestForegroundPermissionsAsync()
    ]);

    const permissionsGranted = {
      contacts: contactStatus.status === 'granted',
      location: locationStatus.status === 'granted'
    };

    if (!permissionsGranted.contacts || !permissionsGranted.location) {
      Alert.alert(
        'Permissions Required',
        'This app needs access to contacts and location for emergency features.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              Platform.OS === 'ios'
                ? Linking.openURL('app-settings:')
                : Linking.openSettings();
            }
          }
        ]
      );
    }

    return permissionsGranted;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    throw error;
  }
};

export const pickContact = async (): Promise<EmergencyContact | null> => {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'This app needs access to your contacts to add emergency contacts.'
      );
      return null;
    }

    try {
      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return null;

      if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) {
        Alert.alert('Invalid Contact', 'Selected contact has no phone number');
        return null;
      }

      const phoneNumber = contact.phoneNumbers?.[0]?.number?.replace(/[^\d+]/g, '') || '';
      return {
        id: contact.id || `${Date.now()}`,
        name: contact.name || 'Unknown',
        phone: phoneNumber,
        relationship: 'Emergency Contact'
      };
    } catch (error) {
      console.error('Error in contact picker:', error);
      Alert.alert('Error', 'Failed to access contacts. Please try again.');
      return null;
    }
  } catch (error) {
    console.error('Error picking contact:', error);
    throw error;
  }
};

export const makeEmergencyCall = async (contact: EmergencyContact) => {
  try {
    const phoneNumber = `tel:${contact.phone}`;
    const supported = await Linking.canOpenURL(phoneNumber);

    if (!supported) {
      throw new Error('Phone calls not supported');
    }

    await Linking.openURL(phoneNumber);
    return true;
  } catch (error) {
    console.error('Error making call:', error);
    throw error;
  }
};

const SOS_TIMEOUT = 30000; // 30 seconds timeout

export const triggerSOS = async (contacts: EmergencyContact[]): Promise<boolean> => {
  try {
    if (contacts.length === 0) {
      Alert.alert('Error', 'No emergency contacts available');
      return false;
    }

    // Handle permissions based on platform
    if (Platform.OS === 'android') {
      const hasPermission = await checkSMSPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'SMS permission is required for emergency messages',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings()
            }
          ]
        );
        return false;
      }
    }

    let location = null;
    try {
      location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Location timeout')), SOS_TIMEOUT)
        )
      ]);
    } catch (error) {
      console.error('[SOS] Location error:', error);
    }

    // Send SMS to all contacts
    let smsSuccess = false;
    for (const contact of contacts) {
      try {
        const result = await Promise.race([
          sendEmergencySMS(contact, location as Location.LocationObject | null),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SMS timeout')), SOS_TIMEOUT)
          )
        ]);
        if (result) smsSuccess = true;
      } catch (error) {
        console.error(`[SOS] Failed to send SMS to ${contact.name}:`, error);
        continue; // Try next contact if one fails
      }
    }

    if (!smsSuccess) {
      Alert.alert('Error', 'Failed to send emergency messages to any contact');
      return false;
    }

    // Try to make emergency call
    try {
      await Promise.race([
        makeEmergencyCall(contacts[0]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Call timeout')), SOS_TIMEOUT)
        )
      ]);
    } catch (error) {
      console.error('[SOS] Call error:', error);
      // Don't fail the SOS if call fails but SMS succeeded
    }

    return smsSuccess;
  } catch (error: any) {
    console.error('[SOS] Error in triggerSOS:', error);
    Alert.alert('Emergency Error', error.message || 'Failed to trigger emergency response');
    return false;
  }
};

const checkSMSPermission = async () => {
  if (Platform.OS === 'web') {
    return true;
  }

  if (Platform.OS === 'android') {
    try {
      const { AndroidSmsModule } = NativeModules;
      if (AndroidSmsModule?.requestSMSPermission) {
        return await AndroidSmsModule.requestSMSPermission();
      }
    } catch (error) {
      console.error('SMS permission check failed:', error);
    }
  }
  return true;
};

export const sendEmergencySMS = async (contact: EmergencyContact, location: Location.LocationObject | null) => {
  try {
    if (Platform.OS === 'android') {
      const hasPermission = await checkSMSPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'SMS permission is required for emergency messages',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Settings',
              onPress: () => Linking.openSettings()
            }
          ]
        );
        return false;
      }
    }

    // Rest of the SMS sending logic
    console.log(`[SOS] Preparing to send SMS to ${contact.name} (${contact.phone})`);
    
    const message = `EMERGENCY: I need immediate help!\n${
      location
        ? `My location: https://www.google.com/maps?q=${location.coords.latitude},${location.coords.longitude}`
        : 'Location not available'
    }`;

    if (Platform.OS === 'android') {
      try {
        // Check if phone number is valid
        const cleanPhone = contact.phone.replace(/[^\d+]/g, '');
        if (!cleanPhone) {
          throw new Error('Invalid phone number');
        }

        // Use SMSService for direct SMS sending
        const result = await SMSService.sendSMS(cleanPhone, message);
        if (result) {
          console.log(`[SOS] SMS sent successfully to ${contact.name}`);
          return true;
        }
        throw new Error('Failed to send SMS');
      } catch (error: any) {
        console.error(`[SOS] SMS sending failed for ${contact.name}:`, error);
        if (error.message === 'Native SMS module not available') {
          // Fallback to expo-sms if native module fails
          const isAvailable = await SMS.isAvailableAsync();
          if (isAvailable) {
            await SMS.sendSMSAsync([contact.phone], message);
            return true;
          }
        }
        Alert.alert('SMS Error', `Failed to send emergency SMS to ${contact.name}: ${error.message}`);
        return false;
      }
    } else {
      // For iOS, use expo-sms
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('SMS is not available on this device');
      }
      await SMS.sendSMSAsync([contact.phone], message);
      return true;
    }
  } catch (error) {
    console.error('[SOS] Error in sendEmergencySMS:', error);
    throw error;
  }
};

