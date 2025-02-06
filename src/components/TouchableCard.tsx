import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Surface } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';

interface TouchableCardProps {
  onPress: () => void;
  style?: ViewStyle;
  children: React.ReactNode;
}

export const TouchableCard: React.FC<TouchableCardProps> = ({ 
  onPress, 
  style, 
  children 
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.touchable, style]}
    >
      <Surface
        style={[
          styles.surface,
          {
            backgroundColor: theme.colors.surface,
          }
        ]}
      >
        {children}
      </Surface>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    marginVertical: 6,
  },
  surface: {
    borderRadius: 12,
    padding: 16,
  },
}); 