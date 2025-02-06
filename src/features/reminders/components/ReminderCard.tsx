import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { TouchableCard } from '../../../components/TouchableCard';
import { Reminder } from '../types/reminder.types';
import { useTheme } from '../../../context/ThemeContext';

interface ReminderCardProps {
  reminder: Reminder;
  onPress: () => void;
}

export const ReminderCard: React.FC<ReminderCardProps> = ({ reminder, onPress }) => {
  const { theme } = useTheme();

  return (
    <TouchableCard onPress={onPress} >
      <View style={styles.reminderHeader}>
        <Text style={[styles.medicineName, { color: theme.colors.text }]}>
          {reminder.medicineName}
        </Text>
      </View>
      <View style={styles.reminderDetails}>
        <Text style={[styles.dosageText, { color: theme.colors.textSecondary }]}>
          {reminder.dosage} {reminder.doseType}
        </Text>
        <View style={styles.timeContainer}>
          {reminder.times.map((time, index) => (
            <Text 
              key={index}
              style={[styles.timeText, { color: theme.colors.primary }]}
            >
              {time}
            </Text>
          ))}
        </View>
      </View>
    </TouchableCard>
  );
};

const styles = StyleSheet.create({
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  reminderDetails: {
    marginLeft: 8,
  },
  dosageText: {
    fontSize: 14,
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
  },
}); 