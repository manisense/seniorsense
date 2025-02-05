import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, Text, Surface } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';

const HealthScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Title
            title={t('health.monitoring')}
            titleStyle={{ color: theme.colors.text }}
          />
          <Card.Content>
            <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
              {t('health.comingSoon')}
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  text: {
    // Add any necessary styles for the Text component
  },
});

export default HealthScreen;