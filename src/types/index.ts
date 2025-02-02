// Base interfaces for user management
export interface User {
  id: string;
  name: string;
  email: string;
}

// Emergency contact information interface
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;  // Changed from 'relation' to 'relationship' to match usage
}

// Feature-specific type exports
export type { EmergencyTypes } from '../features/emergency/types';
export type { ProfileTypes } from '../features/profile/types';
export type { NotificationTypes } from '../features/notifications/types';
