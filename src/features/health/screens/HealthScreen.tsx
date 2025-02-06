import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Card, Button, IconButton, TextInput, Surface } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VitalReading, HealthInsight } from '../types/health.types';
import { STORAGE_KEYS } from '../constants';
import { CustomDialog } from '../../../components/CustomDialog';
import { VitalTrendGraph } from '../components/VitalTrendGraph';
import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { format } from 'date-fns';

export const HealthScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedVital, setSelectedVital] = useState<'bloodPressure' | 'heartRate' | null>(null);
  const [readings, setReadings] = useState<VitalReading[]>([]);
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [newReading, setNewReading] = useState({
    systolic: '',
    diastolic: '',
    heartRate: '',
    timestamp: new Date()
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [showTrends, setShowTrends] = useState(false);

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEYS.HEALTH_DATA);
      if (storedData) {
        const { vitals, insights } = JSON.parse(storedData);
        setReadings(vitals);
        setInsights(insights);
      }
    } catch (error) {
      console.error('Error loading health data:', error);
    }
  };

  const handleAddReading = async () => {
    const newVitalReading: VitalReading = {
      id: Date.now().toString(),
      timestamp: newReading.timestamp,
      type: selectedVital!,
      value: selectedVital === 'bloodPressure' 
        ? { 
            systolic: parseInt(newReading.systolic), 
            diastolic: parseInt(newReading.diastolic) 
          }
        : parseInt(newReading.heartRate),
    };

    const updatedReadings = [...readings, newVitalReading];
    setReadings(updatedReadings);
    await AsyncStorage.setItem(STORAGE_KEYS.HEALTH_DATA, JSON.stringify({
      vitals: updatedReadings,
      insights,
      lastUpdate: new Date()
    }));

    setShowAddDialog(false);
    setNewReading({ systolic: '', diastolic: '', heartRate: '', timestamp: new Date() });
  };

  const generateHealthReport = async () => {
    const csvContent = readings.map(reading => {
      const date = format(new Date(reading.timestamp), 'yyyy-MM-dd HH:mm');
      if (reading.type === 'bloodPressure') {
        const bp = reading.value as { systolic: number; diastolic: number };
        return `${date},${reading.type},${bp.systolic}/${bp.diastolic}`;
      }
      return `${date},${reading.type},${reading.value}`;
    }).join('\n');

    const header = 'Date,Type,Value\n';
    const filePath = `${FileSystem.documentDirectory}health_report.csv`;
    
    try {
      await FileSystem.writeAsStringAsync(filePath, header + csvContent);
      await Share.share({
        url: filePath,
        title: 'Health Report'
      });
    } catch (error) {
      console.error('Error exporting health data:', error);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Vitals Cards */}
      <View style={styles.vitalsContainer}>
        <Card style={[styles.vitalCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content>
            <View style={styles.vitalHeader}>
              <MaterialCommunityIcons name="heart-pulse" size={24} color={theme.colors.error} />
              <Text variant="titleMedium" style={{ color: theme.colors.text }}>
                {t('health.bloodPressure')}
              </Text>
            </View>
            <TextInput
              value="-/-"
              editable={false}
              style={[styles.vitalInput, { backgroundColor: 'transparent' }]}
            />
            <View style={styles.inputGroup}>
              <TextInput
                placeholder={t('health.systolic')}
                style={styles.halfInput}
                keyboardType="numeric"
              />
              <Text style={{ color: theme.colors.text }}>/</Text>
              <TextInput
                placeholder={t('health.diastolic')}
                style={styles.halfInput}
                keyboardType="numeric"
              />
            </View>
            <Button
              mode="contained"
              onPress={() => {
                setSelectedVital('bloodPressure');
                setShowAddDialog(true);
              }}
              style={styles.addButton}
            >
              {t('health.addReading')}
            </Button>
            <TouchableOpacity style={styles.editButton}>
              <Text style={{ color: theme.colors.primary }}>{t('common.edit')}</Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Title
              title={t('sos.medicalInfo')}
              titleStyle={{ color: theme.colors.text }}
              left={props => (
                <MaterialCommunityIcons
                  {...props}
                  name="medical-bag"
                  color={theme.colors.primary}
                />
              )}
            />
            <Card.Content>
              <Text style={{ color: theme.colors.textSecondary }}>
                {t('sos.allergies')}:
              </Text>
              <Text style={{ color: theme.colors.text, marginBottom: 8 }}>
                {/* Add medical info handling */}
                {t('sos.noAllergies')}
              </Text>

              <Text style={{ color: theme.colors.textSecondary }}>
                {t('sos.conditions')}:
              </Text>
              <Text style={{ color: theme.colors.text, marginBottom: 8 }}>
                {/* Add medical info handling */}
                {t('sos.noConditions')}
              </Text>
            </Card.Content>
          </Card>
      </View>

      {/* AI Health Insights */}
      <Card style={[styles.insightsCard, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Card.Content>
          <View style={styles.insightsHeader}>
            <Text variant="titleMedium" style={{ color: theme.colors.text }}>
              {t('health.aiInsights')}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
              {t('health.updatedAgo', { time: '2h' })}
            </Text>
          </View>
          
          {insights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <MaterialCommunityIcons
                name={insight.type === 'success' ? 'check-circle' : 'alert-circle'}
                size={24}
                color={insight.type === 'success' ? theme.colors.primary : theme.colors.warning}
              />
              <Text style={[styles.insightText, { color: theme.colors.text }]}>
                {insight.message}
              </Text>
            </View>
          ))}
          
          <Button
            mode="contained"
            onPress={() => {/* Generate new insights */}}
            style={styles.generateButton}
          >
            {t('health.generateInsights')}
          </Button>
        </Card.Content>
      </Card>

      {/* Add Reading Dialog */}
      <CustomDialog
        visible={showAddDialog}
        onDismiss={() => setShowAddDialog(false)}
        title={t('health.addReading')}
        content={
          <View>
            {selectedVital === 'bloodPressure' ? (
              <View style={styles.dialogInputGroup}>
                <TextInput
                  label={t('health.systolic')}
                  value={newReading.systolic}
                  onChangeText={(text) => setNewReading(prev => ({ ...prev, systolic: text }))}
                  keyboardType="numeric"
                  style={styles.dialogInput}
                />
                <TextInput
                  label={t('health.diastolic')}
                  value={newReading.diastolic}
                  onChangeText={(text) => setNewReading(prev => ({ ...prev, diastolic: text }))}
                  keyboardType="numeric"
                  style={styles.dialogInput}
                />
              </View>
            ) : (
              <TextInput
                label={t('health.heartRate')}
                value={newReading.heartRate}
                onChangeText={(text) => setNewReading(prev => ({ ...prev, heartRate: text }))}
                keyboardType="numeric"
                style={styles.dialogInput}
              />
            )}
          </View>
        }
        actions={[
          {
            label: t('common.cancel'),
            onPress: () => setShowAddDialog(false)
          },
          {
            label: t('common.save'),
            onPress: handleAddReading
          }
        ]}
      />

      {showTrends && (
        <Card style={[styles.trendCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content>
            <View style={styles.trendHeader}>
              <Text variant="titleMedium" style={{ color: theme.colors.text }}>
                {t('health.trends')}
              </Text>
              <View style={styles.periodSelector}>
                {['week', 'month', 'year'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    onPress={() => setSelectedPeriod(period as 'week' | 'month' | 'year')}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period && { backgroundColor: theme.colors.primaryContainer }
                    ]}
                  >
                    <Text style={{ color: theme.colors.text }}>
                      {t(`health.period.${period}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <VitalTrendGraph
              readings={readings}
              type={selectedVital || 'bloodPressure'}
              period={selectedPeriod}
            />
          </Card.Content>
        </Card>
      )}

      {/* Export Data Button */}
      <Button
        mode="outlined"
        onPress={generateHealthReport}
        style={styles.exportButton}
        icon="file-export"
      >
        {t('health.exportData')}
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  vitalsContainer: {
    flexDirection: 'column',
    gap: 16,
  },
  vitalCard: {
    marginBottom: 16,
  },
  vitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  vitalInput: {
    marginVertical: 8,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  addButton: {
    marginTop: 12,
  },
  editButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  insightsCard: {
    marginTop: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  insightText: {
    flex: 1,
  },
  generateButton: {
    marginTop: 16,
  },
  dialogInputGroup: {
    gap: 12,
  },
  dialogInput: {
    marginBottom: 12,
  },
  trendCard: {
    marginTop: 16,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  exportButton: {
    marginTop: 16,
  }
});

export default HealthScreen;