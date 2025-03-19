export interface ProfileType {
  id?: string;
  user_id?: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  age?: number;
  blood_type?: string;
  avatar_url?: string;
  medical_conditions?: string[];
  medications?: string[];
  allergies?: string[];
  preferred_notification_time?: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
} 