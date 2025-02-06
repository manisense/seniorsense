export const STORAGE_KEYS = {
  EMERGENCY_CONTACTS: 'emergency_contacts',
  FALL_DETECTION_ENABLED: 'fall_detection_enabled',
  FALL_DETECTION_SENSITIVITY: 'fall_detection_sensitivity'
};

export const FALL_DETECTION_SETTINGS = {
  SENSITIVITIES: ['low', 'medium', 'high'] as const,
  DEFAULT_SENSITIVITY: 'medium' as const
}; 