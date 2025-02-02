import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, List, Button, IconButton } from 'react-native-paper';
import { pickContact, triggerSOS, requestPermissions } from '../utils/sosHandler';
import { EmergencyContact } from '../../../types';
import { useTranslation } from '../../../hooks/useTranslation';
import { useTheme } from '../../../context/ThemeContext';

const STORAGE_KEY = 'emergency_contacts';
const MAX_CONTACTS = 5;

export const EmergencyContactsList = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);

  useEffect(() => {
    setupComponent();
  }, []);

  const setupComponent = async () => {
    try {
      const permissions = await requestPermissions();
      setHasPermissions(permissions.contacts && permissions.location);
      await loadContacts();
    } catch (error) {
      handleError(error, 'Failed to initialize');
    }
  };

  const loadContacts = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setContacts(JSON.parse(saved));
      }
    } catch (error) {
      handleError(error, 'Failed to load contacts');
    }
  };

  const handleAddContact = async () => {
    if (contacts.length >= MAX_CONTACTS) {
      Alert.alert(t('sos.maxContactsReached'));
      return;
    }

    try {
      setIsLoading(true);
      const contact = await pickContact();
      if (contact) {
        const updatedContacts = [...contacts, contact];
        setContacts(updatedContacts);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedContacts));
      }
    } catch (error) {
      handleError(error, 'Could not add contact');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSOS = async () => {
    if (contacts.length === 0) {
      Alert.alert(t('sos.noContacts'), t('sos.addContactsFirst'));
      return;
    }

    try {
      setIsLoading(true);
      await triggerSOS(contacts);
      Alert.alert(t('sos.success'), t('sos.contactsNotified'));
    } catch (error) {
      handleError(error, 'Could not send SOS');
    } finally {
      setIsLoading(false);
    }
  };

  const removeContact = async (id: string) => {
    try {
      const updatedContacts = contacts.filter(contact => contact.id !== id);
      setContacts(updatedContacts);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedContacts));
    } catch (error) {
      handleError(error, 'Could not remove contact');
    }
  };

  const handleError = (error: any, message: string) => {
    console.error(`${message}:`, error);
    Alert.alert(
      t('error'),
      error instanceof Error ? error.message : message
    );
  };

  return (
    <View style={styles.container}>
      <Button
        mode="outlined"
        onPress={handleAddContact}
        disabled={contacts.length >= MAX_CONTACTS || isLoading}
        style={styles.addButton}
      >
        {t('addEmergencyContact')}
      </Button>

      {contacts.map((contact) => (
        <Card key={contact.id} style={styles.contactCard}>
          <Card.Content style={styles.contactContent}>
            <View style={styles.contactInfo}>
              <List.Item
                title={contact.name}
                description={`${contact.phone} (${contact.relationship})`}
                right={() => (
                  <IconButton
                    icon="delete"
                    onPress={() => removeContact(contact.id)}
                    disabled={isLoading}
                  />
                )}
              />
            </View>
          </Card.Content>
        </Card>
      ))}

      <Button
        mode="contained"
        onPress={handleSOS}
        disabled={contacts.length === 0 || isLoading}
        style={styles.sosButton}
      >
        {t('triggerSOS')}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  addButton: {
    marginBottom: 16,
  },
  contactCard: {
    marginBottom: 8,
  },
  contactContent: {
    padding: 0,
  },
  contactInfo: {
    flex: 1,
  },
  sosButton: {
    marginTop: 16,
    backgroundColor: '#FF3B30',
  },
});
