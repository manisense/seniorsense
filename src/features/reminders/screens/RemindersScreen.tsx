import React, { useState, useEffect, ReactElement } from 'react';
import { StyleSheet, View, ScrollView, Platform, Alert, Modal, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { Card, TextInput, Button, List, Text, IconButton, Switch, Portal, Modal as PaperModal, Chip, Surface, FAB } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { DoseType, Reminder, NotificationSound, NotificationData, ReminderStatus, ReminderDose, FrequencyType, WeekDay, ReminderFrequency, SnoozeInterval, ReminderNotification, ReminderNotificationSettings } from '../types/reminder.types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { STORAGE_KEYS } from '../../../utils/constants';
import { generateId, getLatestDoseStatus, getStatusColor } from '../utils/helpers';

interface DatePickerEvent {
  type: string;
  nativeEvent: {
    timestamp?: number;
  };
}

interface NotificationContent {
  title: string;
  body: string;
  sound: "default";
  data: { 
    reminderId: string;
    notificationId?: string;
  };
}

interface NotificationTrigger {
  hour: number;
  minute: number;
  repeats: boolean;
}

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const STATUS_OPTIONS: { label: string; value: ReminderStatus; icon: IconName; color: string }[] = [
  { label: 'Taken', value: 'taken', icon: 'check-circle', color: '#4CAF50' },
  { label: 'Skipped', value: 'skipped', icon: 'close-circle', color: '#FFC107' },
  { label: 'Missed', value: 'missed', icon: 'alert-circle', color: '#F44336' },
];

const SNOOZE_OPTIONS: { label: string; value: SnoozeInterval }[] = [
  { label: '10 minutes', value: 10 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
];

// Update the medicine type icons mapping with correct icon names
const MEDICINE_TYPE_ICONS: Record<DoseType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  pill: 'pill',
  tablet: 'pill',
  capsule: 'pill',
  injection: 'needle',
  eyeDrops: 'eye-plus-outline',
  syrup: 'bottle-tonic-plus-outline',
  inhaler: 'air-filter'
};

const ReminderCard = ({ 
  reminder, 
  onPress, 
  onEdit, 
  onDelete 
}: { 
  reminder: Reminder; 
  onPress: () => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const latestDose = getLatestDoseStatus(reminder.doses);

  const handleDeleteConfirmation = () => {
    Alert.alert(
      t('reminders.confirmDelete'),
      t('reminders.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.delete'), 
          onPress: () => onDelete(reminder.id),
          style: 'destructive' 
        }
      ]
    );
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={[styles.reminderCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.cardContainer}>
            {/* Left circle with icon */}
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons 
                name={MEDICINE_TYPE_ICONS[reminder.doseType]} 
                size={24} 
                color={theme.colors.primary} 
              />
            </View>

            {/* Middle content */}
            <View style={styles.cardContent}>
              <Text style={[styles.medicineName, { color: theme.colors.text }]}>
                {reminder.medicineName}
              </Text>
              <Text style={[styles.dosageText, { color: theme.colors.textSecondary }]}>
                {reminder.dosage} {t(`reminders.doseTypes.${reminder.doseType}`)}
              </Text>
            </View>

            {/* Right content */}
            <View style={styles.rightContent}>
              {/* Edit and Delete Icons */}
              <View style={styles.actionIcons}>
                <IconButton
                  icon="pencil-outline"
                  size={20}
                  onPress={() => onEdit(reminder)}
                  style={styles.actionIcon}
                />
                <IconButton
                  icon="delete-outline"
                  size={20}
                  onPress={handleDeleteConfirmation}
                  style={styles.actionIcon}
                />
              </View>

              {/* Time */}
              <Text style={[styles.timeText, { color: theme.colors.primary }]}>
                {reminder.times[0]}
              </Text>

              {/* Status Chip */}
              {latestDose && (
                <View style={[styles.statusChip, { 
                  backgroundColor: latestDose.status === 'taken' ? 
                    'rgba(76, 175, 80, 0.1)' : theme.colors.surfaceVariant 
                }]}>
                  <MaterialCommunityIcons
                    name={latestDose.status === 'taken' ? 'check' : 'clock-outline'}
                    size={16}
                    color={latestDose.status === 'taken' ? '#4CAF50' : theme.colors.textSecondary}
                    style={styles.statusIcon}
                  />
                  <Text style={[styles.statusText, { 
                    color: latestDose.status === 'taken' ? '#4CAF50' : theme.colors.textSecondary 
                  }]}>
                    {t(`reminders.status.${latestDose.status}`)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const RemindersScreen: React.FC = (): ReactElement => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  // State declarations
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState<number>(0);
  const [doseType, setDoseType] = useState<DoseType>('pill');
  const [illnessType, setIllnessType] = useState<string>('');
  const [times, setTimes] = useState<Date[]>([new Date()]);
  const [showTimePickerIndex, setShowTimePickerIndex] = useState<number | null>(null);
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily');
  const [frequencyInterval, setFrequencyInterval] = useState(1);
  const [selectedDays, setSelectedDays] = useState<WeekDay[]>([]);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);

  // UI State
  const [showDosageModal, setShowDosageModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');

  // Dates and Settings
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [notificationSound, setNotificationSound] = useState<NotificationSound>('default');
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<ReminderNotification | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);

  // Add these state variables at the top with other states
  const [showDoseTypeModal, setShowDoseTypeModal] = useState(false);
  const [showIllnessTypeModal, setShowIllnessTypeModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Add these constants near the top of the component
  const DOSE_TYPES: DoseType[] = [
    'pill',
    'tablet', 
    'capsule',
    'injection',
    'eyeDrops',
    'syrup',
    'inhaler'
  ];
  const ILLNESS_TYPES = ['diabetes', 'hypertension', 'heart', 'arthritis', 'asthma', 'other'];

  useEffect(() => {
    const initializeApp = async () => {
      await loadReminders();
      await setupNotifications();
    };
    initializeApp();
  }, []);

  useEffect(() => {
    const migrateAndLoadReminders = async () => {
      try {
        // First try to get reminders from old key
        const oldReminders = await AsyncStorage.getItem('reminders');
        console.log('Old reminders found:', oldReminders);
        
        if (oldReminders) {
          // Save to new key
          await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, oldReminders);
          console.log('Migrated reminders to new key:', STORAGE_KEYS.REMINDERS);
          
          // Set reminders in state
          setReminders(JSON.parse(oldReminders));
          
          // Clean up old key
          await AsyncStorage.removeItem('reminders');
        } else {
          // Try loading from new key if no old reminders exist
          const savedReminders = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS);
          console.log('Loading from new key:', savedReminders);
          
          if (savedReminders) {
            setReminders(JSON.parse(savedReminders));
          }
        }
      } catch (error) {
        console.error('Error in migrate and load:', error);
      }
    };

    migrateAndLoadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const savedReminders = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS);
      console.log('Loading saved reminders:', savedReminders);
      if (savedReminders) {
        setReminders(JSON.parse(savedReminders));
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const setupNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('reminders.error'), t('reminders.notificationPermissionRequired'));
        return;
      }
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const handleAddReminder = async () => {
    if (!medicineName.trim()) {
      Alert.alert(t('reminders.error'), t('reminders.medicineNameRequired'));
      return;
    }

    try {
      const newReminder: Reminder = {
        id: Date.now().toString(),
        medicineName,
        dosage: dosage.toString(),
        doseType,
        illnessType,
        frequency: {
          type: frequencyType,
          ...(frequencyType === 'everyXDays' && { interval: frequencyInterval }),
          ...(frequencyType === 'weekly' && { selectedDays }),
        },
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        times: times.map(time => 
          `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
        ),
        isActive: true,
        notificationSettings: {
          sound: notificationSound,
          vibration: vibrationEnabled,
          snoozeEnabled: false,
          defaultSnoozeTime: 10
        },
        doses: [],
        notifications: []
      };

      const updatedReminders = [...reminders, newReminder];
      await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(updatedReminders));
      console.log('Saved reminder:', newReminder);
      console.log('Updated reminders in storage:', JSON.stringify(updatedReminders));
      
      setReminders(updatedReminders);
      await scheduleNotifications(newReminder);
      setShowAddForm(false);
      resetForm();
    } catch (error) {
      console.error('Error adding reminder:', error);
      Alert.alert(t('reminders.error'), t('reminders.errorAddingReminder'));
    }
  };

  const scheduleNotifications = async (reminder: Reminder) => {
    try {
      for (const timeStr of reminder.times) {
        const time = new Date(timeStr);
        const trigger: NotificationTrigger = {
          hour: time.getHours(),
          minute: time.getMinutes(),
          repeats: true,
        };

        const content: NotificationContent = {
          title: t('reminders.notificationTitle', { medicineName: reminder.medicineName }),
          body: t('reminders.notificationBody', {
            dosage: reminder.dosage,
            doseType: reminder.doseType,
            time: new Date(timeStr).toLocaleTimeString()
          }),
          data: { reminderId: reminder.id },
          sound: "default"
        };

        await Notifications.scheduleNotificationAsync({
          content,
          trigger: { seconds: 1 },
        });
      }
    } catch (error) {
      console.error('Error scheduling notifications:', error);
      Alert.alert(t('reminders.error'), t('reminders.errorSchedulingNotifications'));
    }
  };

  const resetForm = () => {
    setMedicineName('');
    setDosage(0);
    setDoseType('pill');
    setIllnessType('');
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setTimes([new Date()]);
    setVibrationEnabled(true);
    setNotificationSound('default');
    setFrequencyType('daily');
    setFrequencyInterval(1);
    setSelectedDays([]);
    setShowAddForm(false);
    setIsEditing(false);
    setEditingReminder(null);
  };

  const handleDateChange = (event: DatePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (datePickerMode === 'start') {
        setStartDate(selectedDate);
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  const handleTimePickerPress = (index: number) => {
    setShowTimePickerIndex(index);
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: DatePickerEvent, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate && showTimePickerIndex !== null) {
      const newTimes = [...times];
      newTimes[showTimePickerIndex] = selectedDate;
      setTimes(newTimes);
    }
  };

  const handleStatusUpdate = async (reminder: Reminder, status: ReminderStatus) => {
    try {
      const now = new Date().toISOString();
      const newDose: ReminderDose = {
        id: Date.now().toString(),
        timestamp: now,
        status,
      };

      const updatedReminder = {
        ...reminder,
        doses: [...reminder.doses, newDose],
      };

      const updatedReminders = reminders.map(r => 
        r.id === reminder.id ? updatedReminder : r
      );

      await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(updatedReminders));
      setReminders(updatedReminders);
      setShowStatusModal(false);
      setSelectedReminder(null);

      // Show confirmation
      Alert.alert(
        t('reminders.statusUpdated'),
        t(`reminders.statusMessages.${status}`, { medicine: reminder.medicineName })
      );
    } catch (error) {
      console.error('Error updating dose status:', error);
      Alert.alert(t('reminders.error'), t('reminders.errorUpdatingStatus'));
    }
  };

  const handleSnooze = async (notification: ReminderNotification, minutes: SnoozeInterval) => {
    try {
      const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();

      const updatedReminders = reminders.map(reminder => {
        if (reminder.id === notification.reminderId) {
          const updatedNotifications = reminder.notifications.map(n => 
            n.id === notification.id 
              ? { ...n, status: 'snoozed' as const, snoozedUntil }
              : n
          );
          return { ...reminder, notifications: updatedNotifications };
        }
        return reminder;
      });

      // Cancel existing notification
      await Notifications.cancelScheduledNotificationAsync(notification.id);
      
      const reminder = reminders.find(r => r.id === notification.reminderId);
      if (!reminder) return;

      // Schedule new notification with correct trigger
      const content: NotificationContent = {
        title: t('reminders.snoozedNotificationTitle', { medicineName: reminder.medicineName }),
        body: t('reminders.notificationBody', {
          dosage: reminder.dosage,
          doseType: reminder.doseType,
          time: format(new Date(snoozedUntil), 'HH:mm')
        }),
        data: { 
          reminderId: reminder.id,
          notificationId: notification.id 
        },
        sound: "default"
      };

      // Use timestamp trigger instead of seconds
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          seconds: minutes * 60 // Convert minutes to seconds
        },
      });

      await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(updatedReminders));
      setReminders(updatedReminders);
      setShowSnoozeModal(false);
      setSelectedNotification(null);

    } catch (error) {
      console.error('Error snoozing notification:', error);
      Alert.alert(t('reminders.error'), t('reminders.errorSnoozingNotification'));
    }
  };

  const handleUpdateSettings = async (reminderId: string, settings: ReminderNotificationSettings) => {
    try {
      const updatedReminders = reminders.map(reminder => 
        reminder.id === reminderId 
          ? { ...reminder, notificationSettings: settings }
          : reminder
      );
      await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(updatedReminders));
      setReminders(updatedReminders);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert(t('reminders.error'), t('reminders.errorUpdatingSettings'));
    }
  };

  const handleReminderPress = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setShowStatusModal(true);
  };

  const handleDosageSelect = (selectedDosage: number) => {
    setDosage(selectedDosage);
    // Initialize times array with evenly spaced times throughout the day
    const newTimes = Array(selectedDosage).fill(null).map((_, index) => {
      const time = new Date();
      const hoursGap = 24 / selectedDosage;
      time.setHours(9 + Math.floor(index * hoursGap), 0, 0); // Start from 9 AM
      return time;
    });
    setTimes(newTimes);
    setShowDosageModal(false);
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setMedicineName(reminder.medicineName);
    setDosage(reminder.times.length);
    setDoseType(reminder.doseType);
    setIllnessType(reminder.illnessType);
    // Convert time strings to Date objects
    setTimes(reminder.times.map(timeStr => {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return date;
    }));
    setFrequencyType(reminder.frequency.type);
    setFrequencyInterval(reminder.frequency.interval || 1);
    setSelectedDays(reminder.frequency.selectedDays || []);
    setStartDate(new Date(reminder.startDate));
    setEndDate(new Date(reminder.endDate));
    setNotificationSound(reminder.notificationSettings.sound);
    setVibrationEnabled(reminder.notificationSettings.vibration);
    setShowAddForm(true);
    setIsEditing(true);
  };

  const handleDeleteReminder = async (reminderId: string) => {
    try {
      // Cancel all notifications for this reminder
      const reminderToDelete = reminders.find(r => r.id === reminderId);
      if (reminderToDelete?.notifications) {
        for (const notification of reminderToDelete.notifications) {
          await Notifications.cancelScheduledNotificationAsync(notification.id);
        }
      }

      // Remove from storage and state
      const updatedReminders = reminders.filter(r => r.id !== reminderId);
      await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(updatedReminders));
      setReminders(updatedReminders);
      Alert.alert(t('reminders.deleted'), t('reminders.reminderDeleted'));
    } catch (error) {
      console.error('Error deleting reminder:', error);
      Alert.alert(t('reminders.error'), t('reminders.errorDeletingReminder'));
    }
  };

  const handleSubmit = async () => {
    if (!medicineName.trim()) {
      Alert.alert(t('reminders.error'), t('reminders.medicineNameRequired'));
      return;
    }

    try {
      const reminderData: Reminder = {
        id: isEditing && editingReminder ? editingReminder.id : generateId(),
        medicineName,
        dosage: dosage.toString(),
        doseType,
        illnessType,
        frequency: {
          type: frequencyType,
          interval: frequencyType === 'everyXDays' ? frequencyInterval : undefined,
          selectedDays: frequencyType === 'weekly' ? selectedDays : undefined,
        },
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        times: times.map(time => 
          `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
        ),
        isActive: true,
        notificationSettings: {
          sound: notificationSound,
          vibration: vibrationEnabled,
          snoozeEnabled: false,
          defaultSnoozeTime: 10
        },
        doses: isEditing && editingReminder ? editingReminder.doses : [],
        notifications: isEditing && editingReminder ? editingReminder.notifications : []
      };

      let updatedReminders: Reminder[];
      if (isEditing && editingReminder) {
        // Cancel existing notifications before updating
        if (editingReminder.notifications) {
          for (const notification of editingReminder.notifications) {
            await Notifications.cancelScheduledNotificationAsync(notification.id);
          }
        }
        updatedReminders = reminders.map(r => 
          r.id === editingReminder.id ? reminderData : r
        );
      } else {
        updatedReminders = [...reminders, reminderData];
      }

      await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(updatedReminders));
      setReminders(updatedReminders);
      
      // Schedule new notifications
      await scheduleNotifications(reminderData);
      
      resetForm();
      Alert.alert(
        t(isEditing ? 'reminders.updated' : 'reminders.added'),
        t(isEditing ? 'reminders.reminderUpdated' : 'reminders.reminderAdded')
      );
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert(t('reminders.error'), t('reminders.errorSavingReminder'));
    }
  };

  const renderDosageModal = () => (
    <Modal
      visible={showDosageModal}
      transparent={true}
      onRequestClose={() => setShowDosageModal(false)}
      animationType="fade"
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowDosageModal(false)}
      >
        <View style={[styles.modalContent, { 
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline 
        }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {t('reminders.selectDosage')}
          </Text>
          <View style={styles.buttonGroup}>
            {[1, 2, 3, 4, 5].map((num) => (
              <Button
                key={num}
                mode="outlined"
                onPress={() => handleDosageSelect(num)}
                style={[styles.dosageButton, { 
                  borderColor: theme.colors.primary,
                  backgroundColor: dosage === num ? theme.colors.primaryContainer : 'transparent'
                }]}
                labelStyle={{ 
                  color: dosage === num ? theme.colors.primary : theme.colors.text 
                }}
              >
                {num}
              </Button>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderStatusModal = () => (
    <Portal>
      <PaperModal
        visible={showStatusModal}
        onDismiss={() => setShowStatusModal(false)}
        contentContainerStyle={[
          styles.statusModal,
          { backgroundColor: theme.colors.surface }
        ]}
      >
        <Text style={[styles.statusModalTitle, { color: theme.colors.text }]}>
          {t('reminders.updateStatus')}
        </Text>
        {STATUS_OPTIONS.map((option) => (
          <List.Item
            key={option.value}
            title={option.label}
            titleStyle={{ color: theme.colors.text }}
            left={() => (
              <MaterialCommunityIcons
                name={option.icon}
                size={24}
                color={option.color || theme.colors.primary}
              />
            )}
            onPress={() => selectedReminder && handleStatusUpdate(selectedReminder, option.value)}
            style={[styles.statusOption, { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline 
            }]}
          />
        ))}
      </PaperModal>
    </Portal>
  );

  const renderFrequencyModal = () => (
    <Portal>
      <PaperModal
        visible={showFrequencyModal}
        onDismiss={() => setShowFrequencyModal(false)}
        contentContainerStyle={[
          styles.frequencyModal,
          { backgroundColor: theme.colors.surface }
        ]}
      >
        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
          {t('reminders.selectFrequency')}
        </Text>
        
        <List.Section>
          <List.Item
            title={t('reminders.frequency.daily')}
            left={props => <List.Icon {...props} icon="calendar-today" />}
            onPress={() => {
              setFrequencyType('daily');
              setShowFrequencyModal(false);
            }}
          />
          <List.Item
            title={t('reminders.frequency.everyXDays')}
            left={props => <List.Icon {...props} icon="calendar-range" />}
            onPress={() => {
              setFrequencyType('everyXDays');
              setShowFrequencyModal(false);
            }}
            right={() => frequencyType === 'everyXDays' && (
              <View style={styles.intervalInput}>
                <TextInput
                  mode="outlined"
                  keyboardType="number-pad"
                  value={frequencyInterval.toString()}
                  onChangeText={(text) => setFrequencyInterval(parseInt(text) || 1)}
                  style={{ width: 60 }}
                />
                <Text style={{ marginLeft: 8, color: theme.colors.text }}>
                  {t('reminders.days')}
                </Text>
              </View>
            )}
          />
          <List.Item
            title={t('reminders.frequency.weekly')}
            left={props => <List.Icon {...props} icon="calendar-week" />}
            onPress={() => {
              setFrequencyType('weekly');
              setShowFrequencyModal(false);
            }}
          />
        </List.Section>

        {frequencyType === 'weekly' && (
          <View style={styles.weekDaysContainer}>
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
              <Chip
                key={day}
                selected={selectedDays.includes(day as WeekDay)}
                onPress={() => {
                  if (selectedDays.includes(day as WeekDay)) {
                    setSelectedDays(selectedDays.filter(d => d !== day));
                  } else {
                    setSelectedDays([...selectedDays, day as WeekDay]);
                  }
                }}
                style={styles.dayChip}
              >
                {t(`reminders.weekDays.${day}`)}
              </Chip>
            ))}
          </View>
        )}

        <Button
          mode="contained"
          onPress={() => setShowFrequencyModal(false)}
          style={styles.modalButton}
        >
          {t('common.done')}
        </Button>
      </PaperModal>
    </Portal>
  );

  const renderSnoozeModal = () => (
    <Portal>
      <PaperModal
        visible={showSnoozeModal}
        onDismiss={() => setShowSnoozeModal(false)}
        contentContainerStyle={[
          styles.snoozeModal,
          { backgroundColor: theme.colors.surface }
        ]}
      >
        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
          {t('reminders.snoozeFor')}
        </Text>
        {SNOOZE_OPTIONS.map((option) => (
          <List.Item
            key={option.value}
            title={option.label}
            onPress={() => selectedNotification && handleSnooze(selectedNotification, option.value)}
            left={props => <List.Icon {...props} icon="clock-outline" />}
          />
        ))}
      </PaperModal>
    </Portal>
  );

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {showAddForm ? (
        <ScrollView style={styles.scrollView}>
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <TextInput
                label={t('reminders.medicineName')}
                value={medicineName}
                onChangeText={setMedicineName}
                style={styles.input}
                mode="outlined"
                theme={theme}
                textColor={theme.colors.text}
              />

              {/* Dose Type Selector */}
              <TouchableOpacity
                onPress={() => setShowDoseTypeModal(true)}
                style={[styles.selector, { borderColor: theme.colors.outline }]}
              >
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  {t('reminders.doseType')}
                </Text>
                <Text style={[styles.value, { color: theme.colors.primary }]}>
                  {t(`reminders.doseTypes.${doseType}`)}
                </Text>
              </TouchableOpacity>

              {/* Illness Type Selector */}
              <TouchableOpacity
                onPress={() => setShowIllnessTypeModal(true)}
                style={[styles.selector, { borderColor: theme.colors.outline }]}
              >
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  {t('reminders.illnessType')}
                </Text>
                <Text style={[styles.value, { color: theme.colors.primary }]}>
                  {illnessType ? t(`reminders.illnessTypes.${illnessType}`) : t('reminders.selectIllnessType')}
                </Text>
              </TouchableOpacity>

              {/* Existing dosage selector */}
              <TouchableOpacity
                onPress={() => setShowDosageModal(true)}
                style={[styles.selector, { borderColor: theme.colors.outline }]}
              >
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  {t('reminders.selectDosage')}
                </Text>
                <Text style={[styles.value, { color: theme.colors.primary }]}>
                  {dosage} {t(`reminders.doseTypes.${doseType}`)}(s)
                </Text>
              </TouchableOpacity>

              {dosage > 0 && (
                <View style={styles.timeInputsContainer}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {t('reminders.medicationTimes')}
                  </Text>
                  {Array.from({ length: dosage }).map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleTimePickerPress(index)}
                      style={[
                        styles.timeInput,
                        { 
                          borderColor: theme.colors.outline,
                          backgroundColor: theme.colors.surface
                        }
                      ]}
                    >
                      <Text style={[styles.timeLabel, { color: theme.colors.text }]}>
                        {t('reminders.dose')} {index + 1}
                      </Text>
                      <Text style={[styles.timeValue, { color: theme.colors.primary }]}>
                        {times[index]?.toLocaleTimeString([], { 
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false 
                        })}
                      </Text>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={24}
                        color={theme.colors.primary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.dateContainer}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  {t('reminders.duration')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setDatePickerMode('start');
                    setShowDatePicker(true);
                  }}
                  style={[styles.timeInput, { borderColor: theme.colors.outline }]}
                >
                  <Text style={[styles.timeLabel, { color: theme.colors.text }]}>
                    {t('reminders.startDate')}
                  </Text>
                  <Text style={[styles.timeValue, { color: theme.colors.primary }]}>
                    {startDate.toLocaleDateString()}
                  </Text>
                  <MaterialCommunityIcons
                    name="calendar"
                    size={24}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setDatePickerMode('end');
                    setShowDatePicker(true);
                  }}
                  style={[styles.timeInput, { borderColor: theme.colors.outline }]}
                >
                  <Text style={[styles.timeLabel, { color: theme.colors.text }]}>
                    {t('reminders.endDate')}
                  </Text>
                  <Text style={[styles.timeValue, { color: theme.colors.primary }]}>
                    {endDate.toLocaleDateString()}
                  </Text>
                  <MaterialCommunityIcons
                    name="calendar"
                    size={24}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>
              <Button
                mode="outlined"
                onPress={() => setShowFrequencyModal(true)}
                style={styles.button}
              >
                {t(`reminders.frequency.${frequencyType}`)}
              </Button>
              <View style={styles.notificationSettings}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  {t('reminders.notificationSettings')}
                </Text>
                <View style={styles.settingRow}>
                  <Text>{t('reminders.sound')}</Text>
                  <Switch
                    value={notificationSound === 'default'}
                    onValueChange={(value) => setNotificationSound(value ? 'default' : 'none')}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.settingRow}>
                  <Text>{t('reminders.vibration')}</Text>
                  <Switch
                    value={vibrationEnabled}
                    onValueChange={setVibrationEnabled}
                  />
                </View>
              </View>
              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.addButton}
              >
                {t('reminders.addNew')}
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      ) : (
        <ScrollView style={styles.scrollView}>
          {reminders.length > 0 ? (
            reminders.map((reminder) => (
              <ReminderCard 
                key={reminder.id} 
                reminder={reminder} 
                onPress={() => handleReminderPress(reminder)}
                onEdit={handleEditReminder}
                onDelete={handleDeleteReminder}
              />
            ))
          ) : (
            <Text style={[styles.noReminders, { color: theme.colors.text }]}>
              {t('reminders.noReminders')}
            </Text>
          )}
        </ScrollView>
      )}

      <FAB
        icon="plus"
        onPress={() => setShowAddForm(!showAddForm)}
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors?.elevation?.level3 || 'rgba(0, 0, 0, 0.15)',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4.65,
            elevation: 6,
          }
        ]}
        color={theme.colors.surface}
      />

      {renderDosageModal()}
      {renderFrequencyModal()}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'start' ? startDate : endDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={datePickerMode === 'end' ? startDate : new Date()}
        />
      )}
      {showTimePicker && showTimePickerIndex !== null && (
        <DateTimePicker
          value={times[showTimePickerIndex]}
          mode="time"
          is24Hour={true}
          onChange={(event, date) => handleTimeChange(event, date)}
        />
      )}
      {renderStatusModal()}
      {renderSnoozeModal()}

      {/* Add these new modals */}
      <Modal
        visible={showDoseTypeModal}
        transparent={true}
        onRequestClose={() => setShowDoseTypeModal(false)}
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDoseTypeModal(false)}
        >
          <View style={[styles.modalContent, { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline 
          }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {t('reminders.selectDoseType')}
            </Text>
            <View style={styles.optionsList}>
              {DOSE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.optionItem, { 
                    backgroundColor: doseType === type ? theme.colors.primaryContainer : 'transparent'
                  }]}
                  onPress={() => {
                    setDoseType(type);
                    setShowDoseTypeModal(false);
                  }}
                >
                  <Text style={[styles.optionText, { 
                    color: doseType === type ? theme.colors.primary : theme.colors.text 
                  }]}>
                    {t(`reminders.doseTypes.${type}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showIllnessTypeModal}
        transparent={true}
        onRequestClose={() => setShowIllnessTypeModal(false)}
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowIllnessTypeModal(false)}
        >
          <View style={[styles.modalContent, { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline 
          }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {t('reminders.selectIllnessType')}
            </Text>
            <View style={styles.optionsList}>
              {ILLNESS_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.optionItem, { 
                    backgroundColor: illnessType === type ? theme.colors.primaryContainer : 'transparent'
                  }]}
                  onPress={() => {
                    setIllnessType(type);
                    setShowIllnessTypeModal(false);
                  }}
                >
                  <Text style={[styles.optionText, { 
                    color: illnessType === type ? theme.colors.primary : theme.colors.text 
                  }]}>
                    {t(`reminders.illnessTypes.${type}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  reminderCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    elevation: 2,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    padding: 20,
    borderRadius: 12,
    width: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  buttonGroup: {
    gap: 8,
  },
  modalButton: {
    marginVertical: 4,
  },
  statusModal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  statusModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statusOption: {
    borderRadius: 8,
    marginVertical: 4,
  },
  frequencyModal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 16,
  },
  dayChip: {
    margin: 4,
  },
  intervalInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  snoozeModal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  flex1: {
    flex: 1,
  },
  button: {
    marginBottom: 8,
  },
  dateContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  notificationSettings: {
    marginVertical: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addButton: {
    marginTop: 16,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reminderDetails: {
    marginLeft: 36,
  },
  dosageText: {
    fontSize: 14,
    opacity: 0.7,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  noReminders: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
  },
  timeInputsContainer: {
    marginVertical: 16,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  selector: {
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionsList: {
    marginTop: 8,
  },
  optionItem: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  optionText: {
    fontSize: 16,
  },
  dosageButton: {
    margin: 4,
    minWidth: 48,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  titleContainer: {
    flex: 1,
  },
  illnessType: {
    fontSize: 12,
    marginTop: 4,
  },
  timeChip: {
    height: 32,
  },
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  actionIcons: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  actionIcon: {
    margin: -8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
});

export default RemindersScreen;
