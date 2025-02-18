import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { List, Surface, Switch, Portal, Modal } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SettingsScreen = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { t, locale, setLocale } = useTranslation();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        <List.Section>
          <List.Subheader style={{ color: theme.colors.text }}>
            {t('settings.appearance')}
          </List.Subheader>
          <List.Item
            title={t('settings.darkMode')}
            titleStyle={{ color: theme.colors.text }}
            left={props => <List.Icon {...props} icon="theme-light-dark" color={theme.colors.primary} />}
            right={() => (
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                color={theme.colors.primary}
              />
            )}
          />
          <List.Item
            title={t('settings.language')}
            titleStyle={{ color: theme.colors.text }}
            description={locale?.toUpperCase() || 'EN'}
            descriptionStyle={{ color: theme.colors.primary }}
            left={props => <List.Icon {...props} icon="translate" color={theme.colors.primary} />}
            right={props => (
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={theme.colors.primary}
              />
            )}
            onPress={() => setShowLanguageModal(true)}
          />
        </List.Section>

        <List.Section>
          <List.Subheader style={{ color: theme.colors.text }}>
            {t('settings.notifications')}
          </List.Subheader>
          <List.Item
            title={t('settings.reminders.title')}
            titleStyle={{ color: theme.colors.text }}
            left={props => <List.Icon {...props} icon="bell" color={theme.colors.primary} />}
            right={() => <Switch value={true} color={theme.colors.primary} />}
          />
        </List.Section>

        <Portal>
          <Modal
            visible={showLanguageModal}
            onDismiss={() => setShowLanguageModal(false)}
            contentContainerStyle={[styles.modalOverlay]}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {t('settings.selectLanguage')}
              </Text>
              {['en', 'hi', 'fr'].map((lang) => (
                <List.Item
                  key={lang}
                  title={t(`settings.languages.${lang}`)}
                  titleStyle={{ color: theme.colors.text }}
                  style={[
                    styles.languageItem,
                    locale === lang && { 
                      backgroundColor: theme.colors.primaryContainer,
                    }
                  ]}
                  right={() => locale === lang && (
                    <MaterialCommunityIcons
                      name="check"
                      size={24}
                      color={theme.colors.primary}
                    />
                  )}
                  onPress={() => {
                    setLocale(lang);
                    setShowLanguageModal(false);
                  }}
                />
              ))}
            </View>
          </Modal>
        </Portal>
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    borderRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  languageItem: {
    borderRadius: 8,
    marginVertical: 4,
  },
});

export default SettingsScreen;