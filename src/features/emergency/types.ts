export interface EmergencyTypes {
  sosStatus: 'idle' | 'sending' | 'sent' | 'error';
  lastSOSTimestamp?: number;
}