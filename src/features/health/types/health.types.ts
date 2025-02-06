export interface VitalReading {
  id: string;
  timestamp: Date;
  type: 'bloodPressure' | 'heartRate' | 'glucose' | 'weight';
  value: number | { systolic: number; diastolic: number };
  note?: string;
}

export interface HealthInsight {
  id: string;
  timestamp: Date;
  type: 'success' | 'warning' | 'info';
  message: string;
  detailsUrl?: string;
}

export interface HealthData {
  vitals: VitalReading[];
  insights: HealthInsight[];
  lastUpdate: Date;
} 