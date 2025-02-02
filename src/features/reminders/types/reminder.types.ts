export interface Reminder {
  id: string;
  medicineName: string;
  dosage: string;
  doseType: string;
  illnessType: string;
  times: string[];
  isActive: boolean;
}