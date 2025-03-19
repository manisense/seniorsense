// Storage keys
export const STORAGE_KEYS = {
  PROFILE: '@senior_wellness:profile' as const,
  SETTINGS: '@senior_wellness:settings' as const,
  THEME: '@senior_wellness:theme' as const,
} as const;

// Profile related constants
export const MAX_NAME_LENGTH = 50;
export const MIN_AGE = 18;
export const MAX_AGE = 120;

// Default values
export type ProfileType = {
  id?: string;
  user_id?: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  age?: number;
  blood_type?: string;
  medical_conditions?: string[];
  medications?: string[];
  allergies?: string[];
  preferred_notification_time?: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
};

export const DEFAULT_PROFILE: ProfileType = {
  full_name: 'Guest',
  age: 0,
  medical_conditions: [],
  medications: [],
  allergies: [],
  preferred_notification_time: '09:00',
  language: 'en',
}; 