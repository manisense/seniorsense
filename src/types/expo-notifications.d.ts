declare module 'expo-notifications' {
  interface NotificationTriggerInput {
    hour?: number;
    minute?: number;
    repeats?: boolean;
    channelId?: string;
  }

  interface NotificationContent {
    title: string;
    body: string;
    sound?: 'default' | null;
    vibrate?: number[];
  }

  interface NotificationRequestInput {
    content: NotificationContent;
    trigger: NotificationTriggerInput;
  }

  interface NotificationPermissionsStatus {
    status: 'granted' | 'denied' | 'undetermined';
  }

  interface NotificationHandler {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
    }>;
  }

  export function requestPermissionsAsync(): Promise<NotificationPermissionsStatus>;
  export function setNotificationHandler(handler: NotificationHandler): Promise<void>;
  export function scheduleNotificationAsync(request: NotificationRequestInput): Promise<string>;
  export function cancelScheduledNotificationAsync(identifier: string): Promise<void>;
}