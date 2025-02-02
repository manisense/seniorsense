import React from 'react';
import { View, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { pickContact, triggerSOS } from '../utils/sosHandler';
import { useTranslation } from '../hooks/useTranslation';

export const EmergencyContactsScreen = () => {
  const { t } = useTranslation();
  const [contacts, setContacts] = React.useState<{name: string, phoneNumber: string}[]>([]);

  const handleAddContact = async () => {
    const contact = await pickContact();
    if (contact) {
      setContacts(prev => [...prev, {
        name: contact.name,
        phoneNumber: contact.phone || '' // Access phone property directly
      }]);
    } else {
      Alert.alert('Error', 'Could not add contact');
    }
  };

  const handleSOS = async () => {
    if (contacts.length === 0) {
      Alert.alert('Error', 'No emergency contacts added');
      return;
    }

    const success = await triggerSOS(contacts.map(contact => ({
      id: Math.random().toString(), // Generate a temporary ID
      name: contact.name,
      phone: contact.phoneNumber,
      relationship: 'emergency contact' // Default relationship
    })));
    if (!success) {
      Alert.alert('Error', 'Could not send SOS messages');
    }
  };

  return (
    <View>
      <Button onPress={handleAddContact}>
        {t('addFromContacts')}
      </Button>
      <Button 
        mode="contained"
        onPress={handleSOS}
        style={{ backgroundColor: 'red' }}
      >
        {t('triggerSOS')}
      </Button>
      {/* Add your contact list UI here */}
    </View>
  );
};
