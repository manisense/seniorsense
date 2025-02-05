import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const FeedScreen = () => {
  const { isDark } = useTheme();

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
        Community Feed
      </Text>
      <View style={styles.placeholder}>
        <Text style={[styles.placeholderText, { color: isDark ? '#E5E7EB' : '#4B5563' }]}>
          Feed content will be displayed here
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
  },
});

export default FeedScreen;