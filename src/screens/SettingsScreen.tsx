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
          <List.Subheader style={{ color: theme.colors.textSecondary }}>
            {t('settings.appearance')}
          </List.Subheader>
          <List.Item
            title={t('settings.darkMode')}
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
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
            description={locale?.toUpperCase() || 'EN'}
            left={props => <List.Icon {...props} icon="translate" />}
            onPress={() => setShowLanguageModal(true)}
          />
        </List.Section>

        <List.Section>
          <List.Subheader style={{ color: theme.colors.textSecondary }}>
            {t('settings.notifications')}
          </List.Subheader>
          <List.Item
            title={t('settings.reminders.title')}
            left={props => <List.Icon {...props} icon="bell" />}
            right={() => <Switch value={true} color={theme.colors.primary} />}
          />
        </List.Section>

        <Portal>
          <Modal
            visible={showLanguageModal}
            onDismiss={() => setShowLanguageModal(false)}
          >
            <View style={[styles.modalOverlay]}>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {t('settings.selectLanguage')}
                </Text>
                {['en', 'hi', 'fr'].map((lang) => (
                  <List.Item
                    key={lang}
                    style={[styles.modalTitle, { color: theme.colors.text }]}
                    title={t(`settings.languages.${lang}`)}
                    onPress={() => {
                      setLocale(lang);
                      setShowLanguageModal(false);
                    }}
                    right={() => locale === lang && (
                      <MaterialCommunityIcons
                        name="check"
                        size={24}
                        color={theme.colors.primary}
                      />
                    )}
                  />
                ))}
              </View>
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
});

export default SettingsScreen;