import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Switch } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';

const SettingsScreen = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <List.Section style={{ backgroundColor: theme.colors.surface }}>
        <List.Item
          title={t('settings.language')}
          description={language === 'en' ? 'English' : 'हिंदी'}
          left={props => <List.Icon {...props} icon="translate" color={theme.colors.primary} />}
          onPress={() => setLanguage(language === 'en' ? 'hi' : 'en')}
          titleStyle={{ color: theme.colors.text }}
          descriptionStyle={{ color: theme.colors.text }}
        />
        <List.Item
          title={t('settings.darkMode')}
          left={props => <List.Icon {...props} icon="theme-light-dark" color={theme.colors.primary} />}
          right={() => (
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              color={theme.colors.primary}
            />
          )}
          titleStyle={{ color: theme.colors.text }}
        />
        <List.Item
          title={t('settings.notifications')}
          left={props => <List.Icon {...props} icon="bell" color={theme.colors.primary} /> }
          right={() => (
            <Switch
              value={true}
              onValueChange={() => {}}
              color={theme.colors.primary}
            />
          )}
          titleStyle={{ color: theme.colors.text }}
        />
        <List.Item
          title={t('settings.about')}
          left={props => <List.Icon {...props} icon="information" color={theme.colors.primary} />}
          onPress={() => {}}
          titleStyle={{ color: theme.colors.text }}
        />
      </List.Section>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SettingsScreen;