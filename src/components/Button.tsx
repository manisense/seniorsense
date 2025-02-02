import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';

interface ButtonProps {
  children: React.ReactNode;
  mode?: 'text' | 'outlined' | 'contained';
  style?: any;
  [key: string]: any;
}

export const Button = ({ children, mode = 'contained', style, ...props }: ButtonProps) => {
  return (
    <PaperButton
      mode={mode}
      {...props}
      style={[styles.button, style]}
    >
      {children}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    padding: 8,
  },
});