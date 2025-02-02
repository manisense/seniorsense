import React from 'react';
import { StyleSheet } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';

interface CardProps {
  children: React.ReactNode;
  style?: any;
  [key: string]: any;
}

export const Card = ({ children, style, ...props }: CardProps) => {
  return (
    <PaperCard {...props} style={[styles.card, style]}>
      {children}
    </PaperCard>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginVertical: 8,
    elevation: 2,
  },
});