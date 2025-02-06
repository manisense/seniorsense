import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { List, Switch, Text, Button, Divider, IconButton, Card, Portal, Dialog } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CustomDialog } from '../../../components/CustomDialog';
import { STORAGE_KEYS } from '../constants';
import { useNavigation, NavigationProp } from '@react-navigation/native';

// Add type for navigation routes
type RootStackParamList = {
  AppearanceSettings: undefined;
  ReminderSettings: undefined;
  LanguageSettings: undefined;
};

// Update navigation type
type NavigationType = NavigationProp<RootStackParamList>;

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी' }
];

const FONT_SIZES = [
  { key: 'small', label: 'Small' },
  { key: 'medium', label: 'Medium' },
  { key: 'large', label: 'Large' }
];

type NotificationSettingsKey = 'reminders' | 'healthTips' | 'emergencyAlerts';

export const SettingsScreen = () => {
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale } = useTranslation();
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showFontSizeDialog, setShowFontSizeDialog] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    reminders: true,
    healthTips: true,
    emergencyAlerts: true,
  });
  const [fontSize, setFontSize] = useState('medium');
  const navigation = useNavigation<NavigationType>();

  // Load saved language on mount
  useEffect(() => {
    loadLanguageSettings();
  }, []);

  const loadLanguageSettings = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
      if (savedLanguage) {
        setLocale(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language settings:', error);
    }
  };

  const handleNotificationToggle = async (key: NotificationSettingsKey) => {
    const newSettings = {
      ...notificationSettings,
      [key]: !notificationSettings[key],
    };
    setNotificationSettings(newSettings);
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(newSettings));
  };

  const handleLanguageChange = async (langCode: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, langCode);
      setLocale(langCode);
      setShowLanguageDialog(false);
    } catch (error) {
      console.error('Error saving language setting:', error);
      Alert.alert(t('settings.error'), t('settings.languageUpdateError'));
    }
  };

  const handleFontSizeChange = async (size: string) => {
    setFontSize(size);
    setShowFontSizeDialog(false);
    await AsyncStorage.setItem(STORAGE_KEYS.FONT_SIZE, size);
  };

  const handleDataExport = async () => {
    try {
      const userData = await AsyncStorage.multiGet([
        STORAGE_KEYS.PROFILE,
        STORAGE_KEYS.REMINDERS,
        STORAGE_KEYS.EMERGENCY_CONTACTS
      ]);
      // Implement data export logic
      Alert.alert(t('settings.exportSuccess'));
    } catch (error) {
      Alert.alert(t('settings.exportError'));
    }
  };

  const handleDataDeletion = () => {
    Alert.alert(
      t('settings.deleteDataTitle'),
      t('settings.deleteDataConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert(t('settings.deleteSuccess'));
            } catch (error) {
              Alert.alert(t('settings.deleteError'));
            }
          },
        },
      ]
    );
  };

  // Language Dialog Component
  const LanguageDialog = () => (
    <Portal>
      <Dialog visible={showLanguageDialog} onDismiss={() => setShowLanguageDialog(false)}>
        <Dialog.Title>{t('settings.selectLanguage')}</Dialog.Title>
        <Dialog.Content>
          {LANGUAGES.map(lang => (
            <List.Item
              key={lang.code}
              title={lang.name}
              onPress={() => handleLanguageChange(lang.code)}
              right={() => 
                locale === lang.code ? (
                  <MaterialCommunityIcons
                    name="check"
                    size={24}
                    color={theme.colors.primary}
                  />
                ) : null
              }
            />
          ))}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowLanguageDialog(false)}>
            {t('common.cancel')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <List.Section>
        <List.Subheader>{t('settings.displaySettings')}</List.Subheader>
        <List.Item
          title={t('settings.appearance')}
          left={props => <List.Icon {...props} icon="palette" />}
          onPress={() => navigation.navigate('AppearanceSettings')}
        />
        <List.Item
          title={t('settings.reminders.title')}
          description={t('settings.reminders.medication')}
          left={props => <List.Icon {...props} icon="bell" />}
          onPress={() => navigation.navigate('ReminderSettings')}
        />
        <List.Item
          title={t('settings.language')}
          description={LANGUAGES.find(lang => lang.code === locale)?.name || 'English'}
          left={props => <List.Icon {...props} icon="translate" />}
          onPress={() => setShowLanguageDialog(true)}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>{t('settings.notifications')}</List.Subheader>
        <List.Item
          title={t('settings.medicationReminders')}
          left={props => <List.Icon {...props} icon="pill" />}
          right={() => (
            <Switch
              value={notificationSettings.reminders}
              onValueChange={() => handleNotificationToggle('reminders')}
            />
          )}
        />
        <List.Item
          title={t('settings.healthTips')}
          left={props => <List.Icon {...props} icon="heart" />}
          right={() => (
            <Switch
              value={notificationSettings.healthTips}
              onValueChange={() => handleNotificationToggle('healthTips')}
            />
          )}
        />
        <List.Item
          title={t('settings.emergencyAlerts')}
          left={props => <List.Icon {...props} icon="alert" />}
          right={() => (
            <Switch
              value={notificationSettings.emergencyAlerts}
              onValueChange={() => handleNotificationToggle('emergencyAlerts')}
            />
          )}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>{t('settings.privacyData')}</List.Subheader>
        <List.Item
          title={t('settings.exportData')}
          left={props => <List.Icon {...props} icon="export" />}
          onPress={handleDataExport}
        />
        <List.Item
          title={t('settings.deleteData')}
          left={props => <List.Icon {...props} icon="delete" />}
          onPress={handleDataDeletion}
          titleStyle={{ color: theme.colors.error }}
        />
        <List.Item
          title={t('settings.privacyPolicy')}
          left={props => <List.Icon {...props} icon="shield" />}
          onPress={() => {/* Open privacy policy */}}
        />
      </List.Section>

      <LanguageDialog />

      {/* Font Size Dialog */}
      <CustomDialog
        visible={showFontSizeDialog}
        onDismiss={() => setShowFontSizeDialog(false)}
        title={t('settings.selectFontSize')}
        content={
          <View>
            {FONT_SIZES.map(size => (
              <List.Item
                key={size.key}
                title={t(`settings.fontSize_${size.key}`)}
                onPress={() => handleFontSizeChange(size.key)}
                right={() => fontSize === size.key && (
                  <MaterialCommunityIcons
                    name="check"
                    size={24}
                    color={theme.colors.primary}
                  />
                )}
              />
            ))}
          </View>
        }
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 16,
  },
});

export default SettingsScreen; 