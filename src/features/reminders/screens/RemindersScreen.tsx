import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { Card, TextInput, Button, List, Menu, Text, IconButton } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { Reminder } from '../types/reminder.types';

const RemindersScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [medicineName, setMedicineName] = useState('');

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

  const [dosage, setDosage] = useState<number | null>(null);
  const [doseType, setDoseType] = useState<string | null>(null);
  const [illnessType, setIllnessType] = useState<string | null>(null);
  const [times, setTimes] = useState([new Date()]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDoseTypeMenu, setShowDoseTypeMenu] = useState(false);
  const [showDosageMenu, setShowDosageMenu] = useState(false);
  const [showIllnessTypeMenu, setShowIllnessTypeMenu] = useState(false);
  const [timePickerIndex, setTimePickerIndex] = useState<number | null>(null);

  const addReminder = async () => {
    if (medicineName && dosage && doseType && illnessType && times.length) {
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

      // Schedule notifications with correct trigger type
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

      // Reset form fields
      setMedicineName('');
      setDosage(null);
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

  const renderTimePickers = () => {
    return times.map((time, index) => (
      <Card key={index} >
        <Button 
          onPress={() => { 
            setShowTimePicker(true); 
            setTimePickerIndex(index); 
          }}
        >
          {t('reminders.time')} {index + 1}
        </Button>
        {showTimePicker && timePickerIndex === index && (
          <DateTimePicker
            value={time}
            mode="time"
            display="default"
            onChange={(event, selectedDate) => handleTimeChange(index, event, selectedDate)}
          />
        )}
      </Card>
    ));
  };

  const handleDosageChange = (value: number) => {
    setDosage(value);
    setTimes(Array(value).fill(new Date()));
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

  const handleMenuOpen = (menuType: 'dosage' | 'doseType' | 'illnessType' | null) => {
    setShowDosageMenu(menuType === 'dosage');
    setShowDoseTypeMenu(menuType === 'doseType');
    setShowIllnessTypeMenu(menuType === 'illnessType');
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title={t('reminders.addNew')} />
        <Card.Content>
          <TextInput
            mode="outlined"
            label={t('reminders.medicineName')}
            value={medicineName}
            onChangeText={setMedicineName}
            style={styles.input}
          />

          <Menu
            visible={showDosageMenu}
            onDismiss={() => setShowDosageMenu(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => handleMenuOpen('dosage')}
                style={styles.menuButton}
              >
                {dosage ? `${dosage} ${t('reminders.doses')}` : t('reminders.selectDosage')}
              </Button>
            }
          >
            {[1, 2, 3, 4, 5].map((num) => (
              <Menu.Item
                key={num}
                onPress={() => {
                  handleDosageChange(num);
                  setShowDosageMenu(false);
                }}
                title={`${num} ${t('reminders.doses')}`}
              />
            ))}
          </Menu>

          {/* Similar Menu components for doseType and illnessType */}
          
          {times.map((time, index) => (
            <View key={index} style={styles.timeContainer}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowTimePicker(true);
                  setTimePickerIndex(index);
                }}
                style={styles.timeButton}
              >
                {t('reminders.time')} {index + 1}: {time.toLocaleTimeString()}
              </Button>
              {showTimePicker && timePickerIndex === index && (
                <DateTimePicker
                  value={time}
                  mode="time"
                  display="default"
                  onChange={(event, selectedDate) => handleTimeChange(index, event, selectedDate)}
                />
              )}
            </View>
          ))}

          <Button
            mode="contained"
            onPress={addReminder}
            style={styles.addButton}
          >
            {t('reminders.save')}
          </Button>
        </Card.Content>
      </Card>

      {reminders.map((reminder) => (
        <Card key={reminder.id} style={styles.reminderCard}>
          <Card.Title
            title={reminder.medicineName}
            right={(props) => (
              <IconButton
                {...props}
                icon="delete"
                onPress={() => handleDeleteReminder(reminder.id)}
              />
            )}
          />
          <Card.Content>
            <List.Item
              title={`${t('reminders.dosage')}: ${reminder.dosage}`}
              description={`${t('reminders.doseType')}: ${t(`reminders.${reminder.doseType}`)}`}
            />
            <List.Item
              title={`${t('reminders.illnessType')}: ${t(`reminders.${reminder.illnessType}`)}`}
              description={`${t('reminders.times')}: ${reminder.times.map(time => 
                new Date(time).toLocaleTimeString()).join(', ')}`}
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
    backgroundColor: '#f5f5f5',
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
});

export default RemindersScreen;