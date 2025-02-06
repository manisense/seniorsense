declare module 'expo-notifications' {
  interface NotificationTriggerInput {
    hour?: number;
    minute?: number;
    seconds?: number;
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

  export function requestPermissionsAsync(): Promise<{ status: string }>;
  export function setNotificationHandler(handler: NotificationHandler): Promise<void>;
  export function scheduleNotificationAsync(options: {
    content: {
      title: string;
      body: string;
      sound?: string;
    };
    trigger: { seconds: number } | null;
  }): Promise<string>;
  export function cancelScheduledNotificationAsync(identifier: string): Promise<void>;
  export function setNotificationChannelAsync(
    channelId: string,
    channelConfig: {
      name: string;
      importance: number;
      vibrationPattern?: number[];
      lightColor?: string;
    }
  ): Promise<void>;
}