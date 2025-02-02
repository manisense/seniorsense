import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: any;
}

export const Card = ({ children, style: customStyle }: CardProps) => {
  return (
    <View style={[styles.card, customStyle]}>
      {children}
    </View>
  );
};

export const CardHeader = ({ children, style: customStyle }: CardProps) => {
  return (
    <View style={[styles.header, customStyle]}>
      {children}
    </View>
  );
};

export const CardTitle = ({ children, style: customStyle }: CardProps) => {
  return (
    <Text style={[styles.title, customStyle]}>
      {children}
    </Text>
  );
};

export const CardContent = ({ children, style: customStyle }: CardProps) => {
  return (
    <View style={[styles.content, customStyle]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'hsl(var(--card))',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: 'hsl(var(--card-foreground))',
  },
  content: {
    marginTop: 8,
  },
});