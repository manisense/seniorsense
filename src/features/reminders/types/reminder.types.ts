export type FrequencyType = 'daily' | 'everyXDays' | 'weekly' | 'custom';
export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type ReminderStatus = 'pending' | 'taken' | 'skipped' | 'missed';
export type DoseType = 'pill' | 'ml' | 'mg' | 'g' | 'other';
export type NotificationSound = 'default' | 'none';
export type SnoozeInterval = 10 | 30 | 60; // minutes

export interface ReminderFrequency {
  type: FrequencyType;
  interval?: number;
  selectedDays?: WeekDay[];
}

export interface ReminderNotificationSettings {
  sound: NotificationSound;
  vibration: boolean;
  snoozeEnabled: boolean;
  defaultSnoozeTime: SnoozeInterval;
}

export interface ReminderDose {
  id: string;
  timestamp: string;
  status: ReminderStatus;
}

export interface ReminderNotification {
  id: string;
  reminderId: string;
  scheduledTime: string;
  snoozedUntil?: string;
  status: 'pending' | 'snoozed' | 'completed';
}

export interface Reminder {
  id: string;
  medicineName: string;
  dosage: string;
  doseType: DoseType;
  illnessType: string;
  frequency: ReminderFrequency;
  startDate: string;
  endDate: string;
  times: string[];
  isActive: boolean;
  notificationSettings: ReminderNotificationSettings;
  doses: ReminderDose[];
  notifications: ReminderNotification[];
}

export interface NotificationData {
  reminderId: string;
}
