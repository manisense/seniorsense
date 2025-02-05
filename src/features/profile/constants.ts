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
  name: string;
  age: number;
  medicalConditions: string[];
  medications: string[];
};

export const DEFAULT_PROFILE: ProfileType = {
  name: 'Guest',
  age: 0,
  medicalConditions: [],
  medications: [],
}; 