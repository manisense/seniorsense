import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';

const HealthScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Health Monitoring" />
        <Card.Content>
          <Text variant="bodyLarge">
            Health monitoring features coming soon...
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
  },
});

export default HealthScreen;