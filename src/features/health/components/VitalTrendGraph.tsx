import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../../context/ThemeContext';
import { VitalReading } from '../types/health.types';
import { VITAL_RANGES } from '../constants';

interface VitalTrendGraphProps {
  readings: VitalReading[];
  type: 'bloodPressure' | 'heartRate';
  period: 'week' | 'month' | 'year';
}

export const VitalTrendGraph: React.FC<VitalTrendGraphProps> = ({ readings, type, period }) => {
  const { theme } = useTheme();
  const screenWidth = Dimensions.get('window').width - 32;

  const formatData = () => {
    const sortedReadings = [...readings]
      .filter(r => r.type === type)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (type === 'bloodPressure') {
      return {
        labels: sortedReadings.map(r => new Date(r.timestamp).toLocaleDateString()),
        datasets: [
          {
            data: sortedReadings.map(r => (r.value as { systolic: number }).systolic),
            color: () => theme.colors.primary,
            strokeWidth: 2
          },
          {
            data: sortedReadings.map(r => (r.value as { diastolic: number }).diastolic),
            color: () => theme.colors.secondary,
            strokeWidth: 2
          }
        ]
      };
    }

    return {
      labels: sortedReadings.map(r => new Date(r.timestamp).toLocaleDateString()),
      datasets: [{
        data: sortedReadings.map(r => r.value as number),
        color: () => theme.colors.primary,
        strokeWidth: 2
      }]
    };
  };

  return (
    <View style={styles.container}>
      <LineChart
        data={formatData()}
        width={screenWidth}
        height={220}
        chartConfig={{
          backgroundColor: theme.colors.surface,
          backgroundGradientFrom: theme.colors.surface,
          backgroundGradientTo: theme.colors.surface,
          decimalPlaces: 0,
          color: (opacity = 1) => theme.colors.primary,
          labelColor: () => theme.colors.text,
          style: {
            borderRadius: 16
          },
          propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: theme.colors.primary
          }
        }}
        bezier
        style={styles.chart}
        onDataPointClick={({ value }) => {
          // Handle tooltip display
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  chart: {
    borderRadius: 16,
  }
}); 