import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, ActivityIndicator, Platform, TouchableOpacity, SafeAreaView } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import * as Linking from 'expo-linking'; // Add this import
import { sendEmergencySMS, makeEmergencyCall } from '../utils/sosHandler';
import { EmergencyContact } from '../../../types';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Text, Button, Portal, Dialog, Surface, Switch, IconButton } from 'react-native-paper';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import { List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FallDetector } from '../utils/fallDetection';
import { STORAGE_KEYS, FALL_DETECTION_SETTINGS } from '../constants';
import * as Notifications from 'expo-notifications';
import { Accelerometer } from 'expo-sensors';

const STORAGE_KEY = 'emergency_contacts';
const MAX_CONTACTS = 5;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const checkPermissions = async () => {
  if (Platform.OS === 'web') {
    return true;
  }

  if (Platform.OS === 'android') {
    try {
      const { NativeModules } = require('react-native');
      const { AndroidSmsModule } = NativeModules;
      
      if (AndroidSmsModule && AndroidSmsModule.requestSMSPermission) {
        const granted = await AndroidSmsModule.requestSMSPermission();
        return granted;
      }
    } catch (error) {
      console.error('SMS permission check failed:', error);
    }
  }

  // For iOS or if Android native module fails
  return true;
};

const SOSScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [permissions, setPermissions] = useState({
    contacts: false,
    location: false
  });
  const [initializing, setInitializing] = useState(true);
  const [fallDetectionEnabled, setFallDetectionEnabled] = useState(false);
  const [fallDetector, setFallDetector] = useState<FallDetector | null>(null);
  const [sensitivity, setSensitivity] = useState<'low' | 'medium' | 'high'>('medium');
  const [fallNotificationId, setFallNotificationId] = useState<string | null>(null);

  useEffect(() => {
    setupScreen();
    const initFallDetection = async () => {
      const enabled = await AsyncStorage.getItem(STORAGE_KEYS.FALL_DETECTION_ENABLED);
      const savedSensitivity = await AsyncStorage.getItem(STORAGE_KEYS.FALL_DETECTION_SENSITIVITY);
      
      setFallDetectionEnabled(enabled === 'true');
      if (savedSensitivity) {
        setSensitivity(savedSensitivity as 'low' | 'medium' | 'high');
      }

      const detector = new FallDetector({
        onFallDetected: handleFallDetected,
        sensitivity: savedSensitivity as 'low' | 'medium' | 'high' || 'medium'
      });
      setFallDetector(detector);

      if (enabled === 'true') {
        detector.start();
      }
    };

    initFallDetection();

    return () => {
      fallDetector?.stop();
    };
  }, []);

  const setupScreen = async () => {
    try {
      setInitializing(true);
      const perms = await requestPermissions();
      setPermissions(perms);
      await loadContacts();
    } catch (error) {
      handleError(error, 'Failed to initialize');
    } finally {
      setInitializing(false);
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

    if (!permissions.contacts) {
      Alert.alert(
        t('sos.permissionDenied'),
        t('sos.contactsAccessRequired'),
        [
          { text: t('sos.cancel'), style: 'cancel' },
          { 
            text: t('sos.openSettings'),
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }
          }
        ]
      );
      return;
    }

    try {
      setLoading(true);

      // First check permissions
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('sos.permissionsNeeded'),
          t('sos.contactsPermissionRequired'),
          [
            { text: t('sos.cancel'), style: 'cancel' },
            { 
              text: t('sos.openSettings'), 
              onPress: () => {
                Platform.OS === 'ios' 
                  ? Linking.openSettings()
                  : Linking.openSettings();
              }
            }
          ]
        );
        return;
      }

      // Get contact using native picker
      try {
        const contact = await Contacts.presentContactPickerAsync();
        if (contact) {
          if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) {
            Alert.alert(t('sos.invalidContact'), t('sos.noPhoneNumber'));
            return;
          }

          const phoneNumber = contact.phoneNumbers?.[0]?.number?.replace(/[^\d+]/g, '') || '';
          
          // Check for duplicate contacts
          const isDuplicate = contacts.some(c => c.phone === phoneNumber);
          if (isDuplicate) {
            Alert.alert(t('sos.contactExists'));
            return;
          }

          // Add new contact
          const newContact: EmergencyContact = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: contact.name || t('sos.unknownContact'),
            phone: phoneNumber,
            relationship: 'Emergency Contact'
          };

          const updatedContacts = [...contacts, newContact];
          setContacts(updatedContacts);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedContacts));
          Alert.alert(t('sos.success'), t('sos.contactAddSuccess'));
        }
      } catch (error) {
        console.error('Contact picker error:', error);
        Alert.alert(t('sos.error'), t('sos.contactPickError'));
      }
    } catch (error) {
      console.error('Add contact error:', error);
      Alert.alert(t('sos.error'), t('sos.contactAddError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSOS = async () => {
    if (contacts.length === 0) {
      Alert.alert(t('sos.error'), t('sos.noContacts'));
      return;
    }

    if (Platform.OS === 'android') {
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        Alert.alert(
          t('sos.permissionsNeeded'),
          t('sos.smsPermissionRequired'),
          [
            { text: t('sos.cancel'), style: 'cancel' },
            { 
              text: t('sos.openSettings'),
              onPress: () => Linking.openSettings()
            }
          ]
        );
        return;
      }
    }

    setConfirmDialog(true);
  };

  const checkLocationServices = async () => {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services to use SOS feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                Platform.OS === 'ios'
                  ? Linking.openURL('app-settings:')
                  : Linking.openSettings();
              },
            },
          ]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  };

  const triggerSOS = async () => {
    if (!permissions.location) {
      Alert.alert(
        t('sos.permissionDenied'),
        t('sos.locationAccessRequired'),
        [
          { text: t('sos.cancel'), style: 'cancel' },
          { 
            text: t('sos.openSettings'),
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }
          }
        ]
      );
      return;
    }

    setConfirmDialog(false);
    setLoading(true);

    try {
      // Check location services first
      const locationEnabled = await checkLocationServices();
      if (!locationEnabled) {
        setLoading(false);
        Alert.alert('Location Required', 'Please enable location services and try again');
        return;
      }

      let location = null;
      if (permissions.location) {
        try {
          Alert.alert('Getting Location', 'Please wait while we get your location...');
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
           
          });
        } catch (locationError) {
          Alert.alert('Location Warning', 'Could not get your location. Proceeding with emergency contact...');
          console.error('Location error:', locationError);
        }
      }

      // Send SMS to all contacts even if location is not available
      let smsSuccessCount = 0;
      for (const contact of contacts) {
        try {
          const sent = await sendEmergencySMS(contact, location);
          if (sent) smsSuccessCount++;
          Alert.alert(
            'SMS Status',
            `${sent ? 'Successfully sent' : 'Failed to send'} SMS to ${contact.name}`
          );
        } catch (error) {
          console.error(`SMS error for ${contact.name}:`, error);
        }
      }

      // Make calls sequentially
      Alert.alert(
        'Making Emergency Calls',
        'The app will now attempt to call your emergency contacts'
      );
      
      for (const contact of contacts) {
        try {
          await makeEmergencyCall(contact);
          // Wait for 5 seconds between calls
          await new Promise<void>((resolve) => setTimeout(resolve, 5000));
        } catch (error) {
          console.error(`Call error for ${contact.name}:`, error);
        }
      }

      Alert.alert(
        'Emergency Alert Status',
        `SMS sent to ${smsSuccessCount} out of ${contacts.length} contacts.\nEmergency calls initiated.`
      );
    } catch (error) {
      handleError(error, 'Failed to send emergency alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    try {
      Alert.alert(
        t('sos.deleteContact'),
        t('sos.confirmDelete'),
        [
          { text: t('sos.cancel'), style: 'cancel' },
          {
            text: t('sos.confirm'),
            style: 'destructive',
            onPress: async () => {
              const updatedContacts = contacts.filter(c => c.id !== contactId);
              setContacts(updatedContacts);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedContacts));
            }
          }
        ]
      );
    } catch (error) {
      handleError(error, t('sos.contactDeleteError'));
    }
  };

  const confirmSOS = () => {
    setConfirmDialog(false);
    triggerSOS();
  };

  const handleError = (error: any, message: string) => {
    console.error(`${message}:`, error);
    Alert.alert('Error', `${message}. ${error.message || 'Please try again.'}`);
  };

  const requestPermissions = async () => {
    try {
      // Skip permissions on web
      if (Platform.OS === 'web') {
        return { contacts: true, location: true };
      }

      const [contactStatus, locationStatus] = await Promise.all([
        Contacts.requestPermissionsAsync(),
        Location.requestForegroundPermissionsAsync()
      ]);

      const perms = {
        contacts: contactStatus.status === 'granted',
        location: locationStatus.status === 'granted'
      };

      if (!perms.contacts || !perms.location) {
        const missingPermissions = [];
        if (!perms.contacts) missingPermissions.push('Contacts');
        if (!perms.location) missingPermissions.push('Location');

        Alert.alert(
          t('sos.permissionsNeeded'),
          t('sos.permissionsMissing') + '\n' + missingPermissions.join(', '),
          [
            { text: t('sos.cancel'), style: 'cancel' },
            { 
              text: t('sos.openSettings'),
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
      }

      return perms;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert(
        t('sos.error'),
        t('sos.permissionsError'),
        [
          { text: t('sos.cancel'), style: 'cancel' },
          { 
            text: t('sos.retry'),
            onPress: () => setupScreen()
          }
        ]
      );
      return { contacts: false, location: false };
    }
  };

  const handleFallDetected = async () => {
    console.log('Fall detection triggered - Showing emergency alert');
    
    // Get current accelerometer data
    const subscription = await Accelerometer.addListener(({ x, y, z }) => {
      console.log('Last accelerometer reading:', { x, y, z });
      subscription.remove();
    });

    Alert.alert(
      t('emergency.fallDetected'),
      t('emergency.fallDetectedMessage'),
      [
        {
          text: t('emergency.imOk'),
          style: 'cancel',
          onPress: async () => {
            console.log('User confirmed they are OK');
            if (fallNotificationId) {
              await Notifications.cancelScheduledNotificationAsync(fallNotificationId);
              setFallNotificationId(null);
            }
          },
        },
        {
          text: t('emergency.getHelp'),
          onPress: () => {
            console.log('User requested emergency help');
            handleEmergency();
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  const toggleFallDetection = async (value: boolean) => {
    console.log(`${value ? 'Enabling' : 'Disabling'} fall detection`);
    setFallDetectionEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEYS.FALL_DETECTION_ENABLED, value.toString());
    
    if (value) {
      console.log('Initializing fall detector with sensitivity:', sensitivity);
      fallDetector?.start();
    } else {
      console.log('Stopping fall detector');
      fallDetector?.stop();
    }
  };

  const handleEmergency = async () => {
    setConfirmDialog(false);
    setLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync();
      for (const contact of contacts) {
        await sendEmergencySMS(contact, location);
        await makeEmergencyCall(contact);
      }
    } catch (error) {
      handleError(error, t('emergency.emergencyError'));
    } finally {
      setLoading(false);
    }
  };

  // Update loading indicator
  if (initializing) {
    return (
      <Surface style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </Surface>
    );
  }

  return (
    <PaperProvider
      theme={{
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: theme.colors.primary,
          surface: theme.colors.surface,
          onSurface: theme.colors.text,
        },
      }}
    >
      <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity
            style={[styles.emergencyButton, { backgroundColor: theme.colors.error }]}
            onPress={handleSOS}
          >
            <MaterialCommunityIcons 
              name="phone" 
              size={48} 
              color={theme.colors.surface} 
            />
            <Text style={[styles.emergencyText, { color: theme.colors.surface }]}>
              {t('sos.triggerEmergency')}
            </Text>
          </TouchableOpacity>

          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Title
              title={t('sos.contacts')}
              titleStyle={{ color: theme.colors.text }}
              left={props => (
                <MaterialCommunityIcons
                  {...props}
                  name="contacts"
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              <Text style={{ color: theme.colors.text }}>
                {t('sos.contactsDescription')}
              </Text>
              <List.Section>
                {contacts.map((contact, index) => (
                  <List.Item
                    key={index}
                    title={contact.name}
                    description={contact.relationship}
                    titleStyle={{ color: theme.colors.text }}
                    descriptionStyle={{ color: theme.colors.textSecondary }}
                    left={props => (
                      <MaterialCommunityIcons
                        {...props}
                        name="account"
                        size={24}
                        color={theme.colors.primary}
                      />
                    )}
                    right={props => (
                      <>
                      <MaterialCommunityIcons
                        {...props}
                        name="phone"
                        size={24}
                        color={theme.colors.primary}
                        onPress={() => makeEmergencyCall(contact)}
                      />
                      <MaterialCommunityIcons
                        {...props}
                        name="message-text"
                        size={24}
                        color={theme.colors.primary}
                        onPress={() => sendEmergencySMS(contact, null)}
                      />
                      </>
                      
                    )}
                  />
                ))}
              </List.Section>
            </Card.Content>
          </Card>

          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.headerRow}>
                <Text variant="titleMedium" style={{ color: theme.colors.text }}>
                  {t('emergency.contacts')}
                </Text>
                <IconButton
                  icon="account-plus"
                  mode="contained-tonal"
                  size={24}
                  onPress={handleAddContact}
                  disabled={contacts.length >= MAX_CONTACTS}
                  style={styles.addButton}
                />
              </View>

              {contacts.length === 0 ? (
                <Text style={{ color: theme.colors.textSecondary, marginVertical: 8 }}>
                  {t('emergency.noContacts')}
                </Text>
              ) : (
                contacts.map((contact, index) => (
                  <View key={index} style={styles.contactRow}>
                    <View style={styles.contactInfo}>
                      <MaterialCommunityIcons
                        name="account-circle"
                        size={36}
                        color={theme.colors.primary}
                      />
                      <View style={styles.contactDetails}>
                        <Text style={{ color: theme.colors.text }}>{contact.name}</Text>
                        <Text style={{ color: theme.colors.textSecondary }}>
                          {contact.phone}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.contactActions}>
                      
                      <IconButton
                        icon="delete"
                        mode="contained-tonal"
                        size={20}
                        onPress={() => {
                          Alert.alert(
                            t('emergency.deleteContact'),
                            t('emergency.confirmDelete'),
                            [
                              { text: t('common.cancel'), style: 'cancel' },
                              {
                                text: t('common.delete'),
                                onPress: () => handleRemoveContact(contact.id),
                                style: 'destructive',
                              },
                            ]
                          );
                        }}
                      />
                    </View>
                  </View>
                ))
              )}
            </Card.Content>
          </Card>

         

          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text variant="titleMedium" style={{ color: theme.colors.text }}>
                    {t('emergency.fallDetection.title')}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.textSecondary }}>
                    {t('emergency.fallDetection.description')}
                  </Text>
                </View>
                <Switch
                  value={fallDetectionEnabled}
                  onValueChange={toggleFallDetection}
                />
              </View>
              {fallDetectionEnabled && (
                <View style={styles.sensitivityContainer}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.text }}>
                    {t('emergency.fallDetection.sensitivity')}
                  </Text>
                  <View style={styles.sensitivityButtons}>
                    {FALL_DETECTION_SETTINGS.SENSITIVITIES.map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.sensitivityButton,
                          sensitivity === level && {
                            backgroundColor: theme.colors.primaryContainer
                          }
                        ]}
                        onPress={async () => {
                          setSensitivity(level);
                          await AsyncStorage.setItem(STORAGE_KEYS.FALL_DETECTION_SENSITIVITY, level);
                          if (fallDetector) {
                            fallDetector.stop();
                            const newDetector = new FallDetector({
                              onFallDetected: handleFallDetected,
                              sensitivity: level
                            });
                            setFallDetector(newDetector);
                            newDetector.start();
                          }
                        }}
                      >
                        <Text style={{ color: theme.colors.text }}>
                          {t(`emergency.fallDetection.${level}`)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
        </ScrollView>
    
        <Portal>
          <Dialog 
            visible={confirmDialog} 
            onDismiss={() => setConfirmDialog(false)}
          >
            <Dialog.Title>{t('sos.confirmEmergency')}</Dialog.Title>
            <Dialog.Content>
              <Text>{t('sos.confirmMessage')}</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setConfirmDialog(false)}>
                {t('sos.cancel')}
              </Button>
              <Button 
                mode="contained"
                onPress={confirmSOS}
                buttonColor={theme.colors.error}
              >
                {t('sos.confirm')}
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </Surface>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emergencyButton: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 4,
  },
  emergencyText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    marginTop: 8,
  },
  info: {
    fontSize: 16,
    marginBottom: 16,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  sensitivityContainer: {
    marginTop: 8,
  },
  sensitivityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  sensitivityButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactDetails: {
    marginLeft: 12,
    flex: 1,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 4,
  },
  addButton: {
    marginLeft: 8,
  },
});

export default SOSScreen;
