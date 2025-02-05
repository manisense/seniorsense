import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert, Modal, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { Card, TextInput, Button, List, Text, IconButton } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { Reminder } from '../types/reminder.types';

const RemindersScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [medicineName, setMedicineName] = useState('');
  const [showDosageModal, setShowDosageModal] = useState(false);

  useEffect(() => {
    loadReminders();
    setupNotifications();
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
  };

  const [dosage, setDosage] = useState<number>(0);
  const [doseType, setDoseType] = useState<string | null>(null);
  const [illnessType, setIllnessType] = useState<string | null>(null);
  const [times, setTimes] = useState([new Date()]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerIndex, setTimePickerIndex] = useState<number | null>(null);

  const addReminder = async () => {
    if (medicineName && dosage > 0 && doseType && illnessType && times.length) {
      const newReminder: Reminder = {
        id: Date.now().toString(),
        medicineName,
        dosage: dosage.toString(),
        doseType,
        illnessType,
        times: times.map(time => time.toISOString()),
        isActive: true,
      };
      const updatedReminders = [...reminders, newReminder];
      setReminders(updatedReminders);
      await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));

      for (const time of times) {
        const trigger: Notifications.NotificationTriggerInput = {
          hour: time.getHours(),
          minute: time.getMinutes(),
          repeats: true,
          channelId: 'medicine-reminders',
        };
      
        await Notifications.scheduleNotificationAsync({
          content: {
            title: t('reminders.notificationTitle', { medicineName }),
            body: t('reminders.notificationBody', { 
              dosage, 
              doseType, 
              time: time.toLocaleTimeString() 
            }),
            sound: 'default',
            vibrate: [0, 250, 250, 250],
          },
          trigger,
        });
      }

      setMedicineName('');
      setDosage(0);
      setDoseType(null);
      setIllnessType(null);
      setTimes([new Date()]);
    }
  };

  const handleTimeChange = (index: number, event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || times[index];
    const newTimes = [...times];
    newTimes[index] = currentDate;
    setTimes(newTimes);
    setShowTimePicker(false);
  };

  const handleDosageChange = (value: number) => {
    setDosage(value);
    setTimes(Array(value).fill(new Date()));
    setShowDosageModal(false);
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      const updatedReminders = reminders.filter(reminder => reminder.id !== id);
      setReminders(updatedReminders);
      await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (error) {
      console.error('Error deleting reminder:', error);
      Alert.alert(t('reminders.error'), t('reminders.deleteError'));
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
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {t('reminders.selectDosage')}
          </Text>
          <View style={styles.buttonGroup}>
            {[1, 2, 3, 4, 5].map((num) => (
              <Button
                key={num}
                mode="outlined"
                onPress={() => handleDosageChange(num)}
                style={styles.modalButton}
                textColor={theme.colors.text}
              >
                {`${num} ${t('reminders.doses')}`}
              </Button>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Title 
          title={t('reminders.addNew')} 
          titleStyle={{ color: theme.colors.text }}
        />
        <Card.Content>
          <TextInput
            mode="outlined"
            label={t('reminders.medicineName')}
            value={medicineName}
            onChangeText={setMedicineName}
            style={styles.input}
            theme={theme}
            textColor={theme.colors.text}
          />

          <Button
            mode="outlined"
            onPress={() => setShowDosageModal(true)}
            style={styles.menuButton}
            textColor={theme.colors.text}
            labelStyle={{ color: theme.colors.text }}
          >
            {dosage > 0 ? `${dosage} ${t('reminders.doses')}` : t('reminders.selectDosage')}
          </Button>

          {renderDosageModal()}
          
          {times.map((time, index) => (
            <View key={index} style={styles.timeContainer}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowTimePicker(true);
                  setTimePickerIndex(index);
                }}
                style={styles.timeButton}
                textColor={theme.colors.text}
              >
                {t('reminders.time')} {index + 1}: {time.toLocaleTimeString()}
              </Button>
              {showTimePicker && timePickerIndex === index && (
                <DateTimePicker
                  value={time}
                  mode="time"
                  display="default"
                  onChange={(event, selectedDate) => handleTimeChange(index, event, selectedDate)}
                  themeVariant={theme.dark ? 'dark' : 'light'}
                />
              )}
            </View>
          ))}

          <Button
            mode="contained"
            onPress={addReminder}
            style={styles.addButton}
            textColor={theme.colors.surface}
          >
            {t('reminders.save')}
          </Button>
        </Card.Content>
      </Card>

      {reminders.map((reminder) => (
        <Card key={reminder.id} style={[styles.reminderCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Title
            title={reminder.medicineName}
            titleStyle={{ color: theme.colors.text }}
            right={(props) => (
              <IconButton
                {...props}
                icon="delete"
                onPress={() => handleDeleteReminder(reminder.id)}
                iconColor={theme.colors.error}
              />
            )}
          />
          <Card.Content>
            <List.Item
              title={`${t('reminders.dosage')}: ${reminder.dosage}`}
              description={`${t('reminders.doseType')}: ${t(`reminders.${reminder.doseType}`)}`}
              titleStyle={{ color: theme.colors.text }}
              descriptionStyle={{ color: theme.colors.text }}
            />
            <List.Item
              title={`${t('reminders.illnessType')}: ${t(`reminders.${reminder.illnessType}`)}`}
              description={`${t('reminders.times')}: ${reminder.times.map(time => 
                new Date(time).toLocaleTimeString()).join(', ')}`}
              titleStyle={{ color: theme.colors.text }}
              descriptionStyle={{ color: theme.colors.text }}
            />
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  menuButton: {
    marginBottom: 16,
  },
  timeContainer: {
    marginBottom: 8,
  },
  timeButton: {
    marginBottom: 8,
  },
  addButton: {
    marginTop: 16,
  },
  reminderCard: {
    marginBottom: 16,
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
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonGroup: {
    gap: 8,
  },
  modalButton: {
    marginBottom: 8,
  },
});

export default RemindersScreen;
