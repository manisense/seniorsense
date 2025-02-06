export const STORAGE_KEYS = {
  HEALTH_DATA: 'health_data',
  HEALTH_SETTINGS: 'health_settings',
};

export const VITAL_RANGES = {
  bloodPressure: {
    systolic: { min: 90, max: 140 },
    diastolic: { min: 60, max: 90 }
  },
  heartRate: { min: 60, max: 100 },
  glucose: { min: 70, max: 140 },
}; 