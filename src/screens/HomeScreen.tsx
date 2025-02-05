import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const HomeScreen = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={[styles.welcome, { color: theme.colors.text }]}>
        {t('home.welcome')}
      </Text>
      
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={{ backgroundColor: theme.colors.surface }}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Reminders')}
            style={styles.button}
            icon="plus-circle"
          >
            {t('home.addReminder')}
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('SOS')}
            style={styles.button}
            icon="alert-circle"
          >
            {t('home.emergency')}
          </Button>

          <Button
            mode="outlined"
            onPress={() => {}}
            icon="information"
          >
            {t('home.dailyTips')}
          </Button>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Title titleStyle={{ color: theme.colors.text }} title={t('home.healthSummary')} />
        <Card.Content>
          <Text variant="bodyMedium">Coming soon...</Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  welcome: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 8,
  },
});

export default HomeScreen;