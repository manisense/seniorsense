import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

export const LoadingIndicator = ({ size = 'large' }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size as 'small' | 'large'} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});