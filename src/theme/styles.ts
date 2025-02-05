import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createSharedStyles = (theme: MD3Theme) => StyleSheet.create({
  // Card and Surface shadows
  surfaceElevation1: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  
  surfaceElevation2: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    elevation: 2,
  },

  // Interactive button styles
  buttonContainer: {
    borderRadius: 8,
    overflow: 'hidden', // For ripple effect
    shadowColor: theme.colors?.elevation?.level2 || 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },

  // Common padding and spacing
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },

  // Card styles
  card: {
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  },

  // Input field styles
  input: {
    marginBottom: 16,
    backgroundColor: theme.colors.surfaceVariant,
  },
}); 