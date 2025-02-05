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
import { CustomTheme } from '../../../context/ThemeContext';
import { TouchableCard } from '../../../components/TouchableCard';

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

const ReminderCard = ({ reminder, onPress }: { reminder: Reminder; onPress: () => void }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const latestDose = getLatestDoseStatus(reminder.doses);

  return (
    <TouchableCard
      onPress={onPress}
      style={styles.reminderCard}
    >
      <View style={styles.reminderHeader}>
        <MaterialCommunityIcons 
          name="pill" 
          size={24} 
          color={theme.colors.primary} 
        />
        <Text style={[styles.medicineName, { color: theme.colors.text }]}>
          {reminder.medicineName}
        </Text>
      </View>
      <View style={styles.reminderDetails}>
        <Text style={[styles.dosageText, { color: theme.colors.textSecondary }]}>
          {`${reminder.dosage} ${reminder.doseType}`}
        </Text>
        <View style={styles.timeContainer}>
          {reminder.times.map((time, index) => (
            <Text 
              key={index} 
              style={[styles.timeText, { color: theme.colors.primary }]}
            >
              {new Date(time).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          ))}
        </View>
        {latestDose && (
          <View style={[
            styles.statusBadge, 
            { backgroundColor: getStatusColor(latestDose.status, theme) }
          ]}>
            <Text style={styles.statusText}>
              {t(`reminders.status.${latestDose.status}`)}
            </Text>
          </View>
        )}
      </View>
    </TouchableCard>
  );
};

const getStatusColor = (status: ReminderStatus, theme: CustomTheme) => {
  switch (status) {
    case 'taken':
      return theme.colors.success;
    case 'skipped':
      return theme.colors.warning;
    case 'missed':
      return theme.colors.error;
    default:
      return theme.colors.disabled;
  }
};

const getLatestDoseStatus = (doses: ReminderDose[]) => {
  if (doses.length === 0) return null;
  return doses[doses.length - 1];
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
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily');
  const [frequencyInterval, setFrequencyInterval] = useState(1);
  const [selectedDays, setSelectedDays] = useState<WeekDay[]>([]);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);

  // UI State
  const [showDosageModal, setShowDosageModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [timePickerIndex, setTimePickerIndex] = useState<number | null>(null);

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

  useEffect(() => {
    const initializeApp = async () => {
      await loadReminders();
      await setupNotifications();
    };
    initializeApp();
  }, []);

  const loadReminders = async () => {
    try {
      const savedReminders = await AsyncStorage.getItem('reminders');
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
      const frequency: ReminderFrequency = {
        type: frequencyType,
        ...(frequencyType === 'everyXDays' && { interval: frequencyInterval }),
        ...(frequencyType === 'weekly' && { selectedDays }),
      };

      const newReminder: Reminder = {
        id: Date.now().toString(),
        medicineName,
        dosage: dosage.toString(),
        doseType,
        illnessType,
        frequency,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        times: times.map(time => time.toISOString()),
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
      await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));
      setReminders(updatedReminders);
      
      await scheduleNotifications(newReminder);
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
          trigger,
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

  const handleTimeChange = (index: number, event: DatePickerEvent, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const newTimes = [...times];
      newTimes[index] = selectedDate;
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

      await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));
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

      await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));
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

      await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));
      setReminders(updatedReminders);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert(t('reminders.error'), t('reminders.errorUpdatingSettings'));
    }
  };

  const handleReminderPress = (reminder: Reminder) => {
    console.log('Reminder pressed:', reminder);
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
                onPress={() => {
                  setDosage(num);
                  setTimes(Array(num).fill(new Date()));
                  setShowDosageModal(false);
                }}
                style={styles.modalButton}
                textColor={theme.colors.text}
                buttonColor={theme.colors.surface}
              >
                {`${num} ${t('reminders.doses')}`}
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
              <View style={styles.row}>
                <TextInput
                  label={t('reminders.dosage')}
                  value={dosage.toString()}
                  onChangeText={(text) => setDosage(parseInt(text) || 0)}
                  keyboardType="numeric"
                  style={[styles.input, styles.flex1]}
                  mode="outlined"
                />
                <TextInput
                  label={t('reminders.doseType')}
                  value={doseType}
                  onChangeText={setDoseType as (text: string) => void}
                  style={[styles.input, styles.flex1]}
                  mode="outlined"
                />
              </View>
              <TextInput
                label={t('reminders.illnessType')}
                value={illnessType}
                onChangeText={setIllnessType}
                style={styles.input}
                mode="outlined"
              />
              <Button
                mode="outlined"
                onPress={() => setShowDosageModal(true)}
                style={styles.button}
                textColor={theme.colors.primary}
                buttonColor={theme.colors.surface}
              >
                {t('reminders.selectDosage')}
              </Button>
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
                onPress={handleAddReminder}
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
      {showTimePicker && timePickerIndex !== null && (
        <DateTimePicker
          value={times[timePickerIndex]}
          mode="time"
          display="default"
          onChange={(event, date) => handleTimeChange(timePickerIndex, event, date)}
        />
      )}
      {renderStatusModal()}
      {renderSnoozeModal()}
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
    marginBottom: 12,
    borderRadius: 12,
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
    marginBottom: 4,
    fontSize: 16,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  reminderDetails: {
    marginLeft: 36,
  },
  dosageText: {
    fontSize: 14,
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
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
});

export default RemindersScreen;
