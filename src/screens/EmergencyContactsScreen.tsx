import React, { useEffect } from 'react';
import { View, Alert, StyleSheet, ScrollView } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { useTranslation } from '../hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickContact, triggerSOS } from '@/features/emergency/utils/sosHandler';

const STORAGE_KEY = 'emergency_contacts';
const MAX_CONTACTS = 5;

export const EmergencyContactsScreen = () => {
  const { t } = useTranslation();
  const [contacts, setContacts] = React.useState<{name: string, phoneNumber: string}[]>([]);
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setContacts(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
      Alert.alert(t('error'), t('errorLoadingContacts'));
    }
  };

  const handleAddContact = async () => {
    if (contacts.length >= MAX_CONTACTS) {
      Alert.alert(t('error'), t('maxContactsReached'));
      return;
    }

    try {
      setLoading(true);
      const contact = await pickContact();
      if (contact) {
        const newContacts = [...contacts, {
          name: contact.name,
          phoneNumber: contact.phone || ''
        }];
        setContacts(newContacts);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newContacts));
      }
    } catch (error) {
      console.error('Failed to add contact:', error);
      Alert.alert(t('error'), t('errorAddingContact'));
    } finally {
      setLoading(false);
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

  const handleRemoveContact = async (index: number) => {
    try {
      const newContacts = contacts.filter((_, i) => i !== index);
      setContacts(newContacts);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newContacts));
    } catch (error) {
      console.error('Failed to remove contact:', error);
      Alert.alert(t('error'), t('errorRemovingContact'));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {contacts.map((contact, index) => (
          <Card key={index} style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium">{contact.name}</Text>
              <Text variant="bodyMedium">{contact.phoneNumber}</Text>
              <Button 
                mode="outlined" 
                onPress={() => handleRemoveContact(index)}
                style={styles.removeButton}
                disabled={loading}
              >
                {t('removeContact')}
              </Button>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button 
          mode="outlined"
          onPress={handleAddContact}
          style={styles.button}
          disabled={loading || contacts.length >= MAX_CONTACTS}
        >
          {t('addFromContacts')}
        </Button>
        <Button 
          mode="contained"
          onPress={handleSOS}
          style={[styles.button, styles.sosButton]}
          disabled={loading || contacts.length === 0}
        >
          {t('triggerSOS')}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5'
  },
  scrollView: {
    flex: 1,
    marginBottom: 16
  },
  card: {
    marginBottom: 8
  },
  removeButton: {
    marginTop: 8
  },
  buttonContainer: {
    gap: 8
  },
  button: {
    width: '100%'
  },
  sosButton: {
    backgroundColor: 'red'
  }
});

