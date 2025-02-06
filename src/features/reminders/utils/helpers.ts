// Create a new utility file for helper functions
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getLatestDoseStatus = (doses: ReminderDose[]): ReminderDose | null => {
  if (!doses || doses.length === 0) return null;
  return doses.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];
};

export const getStatusColor = (status: ReminderStatus | undefined, theme: any): string => {
  if (!status) return theme.colors.outline;
  
  switch (status) {
    case 'taken':
      return theme.colors.success || '#4CAF50';
    case 'missed':
      return theme.colors.error || '#F44336';
    case 'skipped':
      return theme.colors.warning || '#FF9800';
    default:
      return theme.colors.outline;
  }
}; 