import React from 'react';
import { ScrollView, StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { Text, Surface, Avatar, FAB } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TouchableCard } from '../components/TouchableCard';

// Add this type at the top with other interfaces
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

// Update the interfaces
interface QuickActionButtonProps {
  icon: IconName;  // Changed from string to IconName
  title: string;
  onPress: () => void;
  color?: string;
  backgroundColor?: string;
}

interface HealthMetricCardProps {
  icon: IconName;  // Changed from string to IconName
  value: string;
  label: string;
  iconColor?: string;
}

interface MedicationReminderProps {
  medicine: string;
  dosage: string;
  time: string;
}

type TabParamList = {
  Home: undefined;
  Reminders: undefined;
  Health: undefined;
  SOS: undefined;
};

const HomeScreen = ({ navigation }: { navigation: BottomTabNavigationProp<TabParamList> }) => {
  const { t } = useTranslation();
  const { isDark, theme } = useTheme();  // Use isDark and theme from theme

  const QuickActionButton: React.FC<QuickActionButtonProps> = ({ 
    icon, 
    title, 
    onPress, 
    color, 
    backgroundColor 
  }) => {
    const { theme } = useTheme();
    
    return (
      <TouchableCard
        onPress={onPress}
        style={styles.quickActionContainer}
      >
        <View style={[
          styles.quickAction,
          { backgroundColor: backgroundColor || theme.colors.surface }
        ]}>
          <MaterialCommunityIcons 
            name={icon} 
            size={24} 
            color={color || theme.colors.primary} 
          />
          <Text style={[
            styles.quickActionText, 
            { color: theme.colors.text }
          ]}>
            {title}
          </Text>
        </View>
      </TouchableCard>
    );
  };

  const HealthMetricCard: React.FC<HealthMetricCardProps> = ({ icon, value, label, iconColor }) => {
    return (
      <>
        <MaterialCommunityIcons 
          name={icon} 
          size={24} 
          color={iconColor || theme.colors.primary} 
        />
        <Text style={[styles.metricValue, { color: theme.colors.text }]}>
          {value}
        </Text>
        <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
      </>
    );
  };

  const MedicationReminder: React.FC<MedicationReminderProps> = ({ medicine, dosage, time }) => {
    return (
      <Surface style={[styles.reminderCard, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.reminderIcon, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="pill" size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.reminderInfo}>
          <Text style={[styles.medicineName, { color: theme.colors.text }]}>
            {medicine}
          </Text>
          <Text style={[styles.dosageText, { color: theme.colors.textSecondary }]}>
            {dosage}
          </Text>
        </View>
        <Text style={[styles.timeText, { color: theme.colors.primary }]}>
          {time}
        </Text>
      </Surface>
    );
  };

  // Add voice assistant handler
  const handleVoiceAssistant = () => {
    // Voice assistant logic will go here
    console.log('Voice assistant activated');
  };

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: isDark ? '#1F2937' : '#F5F5F5' }]}>
        
        <View style={styles.quickActions}>
          <QuickActionButton
            icon="pill"
            title="Add Reminder"
            onPress={() => navigation.jumpTo('Reminders')}
          />
          <QuickActionButton
            icon="heart"
            title="Health Data"
            onPress={() => navigation.jumpTo('Health')}
          />
          <QuickActionButton
            icon="phone"
            title="SOS"
            onPress={() => navigation.jumpTo('SOS')}
          />
        </View>

        {/* Daily Health Tip */}
        <Surface style={[styles.tipCard, { backgroundColor: isDark ? '#374151' : '#fff' }]}>
          <View style={styles.tipHeader}>
            <MaterialCommunityIcons name="lightbulb" size={24} color="#FFD700" />
            <Text style={[styles.tipTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              Daily Health Tip
            </Text>
          </View>
          <View style={styles.tipContent}>
            <Image
              source={require('../assets/meditation.png')}
              style={styles.tipImage}
            />
            <Text style={[styles.tipText, { color: isDark ? '#9CA3AF' : '#666' }]}>
              Taking 10 minutes for mindful meditation each morning can help reduce stress and improve focus throughout your day.
            </Text>
          </View>
        </Surface>

        {/* Upcoming Reminders */}
        <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          Upcoming Reminders
        </Text>
        <MedicationReminder
          medicine="Metformin"
          dosage="500mg - 1 tablet"
          time="9:00 AM"
          
        />
        <MedicationReminder
          medicine="Lisinopril"
          dosage="10mg - 1 tablet"
          time="2:00 PM"
        />
        <MedicationReminder
          medicine="Aspirin"
          dosage="81mg - 1 tablet"
          time="8:00 PM"
        />

        {/* Health Summary */}
        <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          Health Summary
        </Text>
        <View style={styles.healthMetrics}>
          <Surface style={[styles.metricCard, { backgroundColor: isDark ? '#374151' : '#fff' }]}>
            <HealthMetricCard
              icon="heart-pulse"
              value="120/80"
              label="Blood Pressure"
              iconColor="#4CAF50"
            />
          </Surface>
          <Surface style={[styles.metricCard, { backgroundColor: isDark ? '#374151' : '#fff' }]}>
            <HealthMetricCard
              icon="water-percent"
              value="110"
              label="Glucose"
              iconColor="#FFC107"
            />
          </Surface>
          <Surface style={[styles.metricCard, { backgroundColor: isDark ? '#374151' : '#fff' }]}>
            <HealthMetricCard
              icon="scale"
              value="165 lbs"
              label="Weight"
              iconColor="#2196F3"
            />
          </Surface>
        </View>
      </ScrollView>

      {/* Add FAB for voice assistant */}
      <FAB
        icon="microphone"
        style={[
          styles.fab,
          { backgroundColor: theme.colors.primary }
        ]}
        color={theme.colors.surface}
        onPress={handleVoiceAssistant}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
    padding: 16,
  },
  quickActionContainer: {
    flex: 1,
    minWidth: 0,
  },
  quickAction: {
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  quickActionText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  tipCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#fff',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 2,
  },
  reminderIcon: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderInfo: {
    flex: 1,
    marginLeft: 16,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  dosageText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  healthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    elevation: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
    color: '#000',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    elevation: 4,
  },
});

export default HomeScreen;