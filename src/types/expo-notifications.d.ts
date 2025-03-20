declare module 'expo-notifications' {
  // Basic types
  export type NotificationRequest = {
    identifier: string;
    content: NotificationContent;
    trigger: any;
  };

  export type NotificationContent = {
    title: string;
    body: string;
    data: any;
    sound?: string | boolean;
    badge?: number;
    color?: string;
    vibrationPattern?: number[];
    channelId?: string;
  };

  export type NotificationContentInput = {
    title: string;
    body: string;
    data?: any;
    sound?: string | boolean;
    badge?: number;
    color?: string;
    vibrationPattern?: number[];
    channelId?: string;
  };

  export type NotificationTrigger = {
    seconds?: number;
    repeats?: boolean;
    hour?: number;
    minute?: number;
  };

  export type NotificationResponse = {
    notification: Notification;
    actionIdentifier: string;
    userText?: string;
  };

  export type Notification = {
    date: number;
    request: NotificationRequest;
  };

  // Function definitions
  export function scheduleNotificationAsync(options: {
    content: NotificationContentInput;
    trigger: null | { seconds: number; } | { repeats?: boolean; hour: number; minute: number; };
  }): Promise<string>;

  export function cancelScheduledNotificationAsync(identifier: string): Promise<void>;
  export function cancelAllScheduledNotificationsAsync(): Promise<void>;
  export function getAllScheduledNotificationsAsync(): Promise<NotificationRequest[]>;
  export function getPresentedNotificationsAsync(): Promise<NotificationRequest[]>;

  export function addNotificationReceivedListener(
    listener: (notification: Notification) => void
  ): { remove: () => void };

  export function addNotificationResponseReceivedListener(
    listener: (response: NotificationResponse) => void
  ): { remove: () => void };

  export function setNotificationHandler(handler: {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      priority?: 'max' | 'high' | 'low' | 'min' | 'default';
    }>;
  }): void;

  export function setNotificationChannelAsync(
    channelId: string,
    channelConfig: {
      name: string;
      importance: number;
      vibrationPattern?: number[];
      lightColor?: string;
      sound?: string;
    }
  ): Promise<any>;

  export function requestPermissionsAsync(): Promise<{ status: string; expires: string }>;
}