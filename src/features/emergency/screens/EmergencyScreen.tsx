import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { EmergencyContactsList } from '../components/EmergencyContactsList';

export const EmergencyScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <EmergencyContactsList />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
