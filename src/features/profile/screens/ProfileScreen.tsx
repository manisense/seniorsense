import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, TextInput, Button, Text } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { ProfileTypes } from '../types';

const PROFILE_STORAGE_KEY = 'user_profile';

export const ProfileScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ProfileTypes['userProfile']>({
    name: '',
    age: 0,
    medicalConditions: [],
    medications: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const saveProfile = async () => {
    try {
      setLoading(true);
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      Alert.alert(t('profile.updateSuccess'));
    } catch (error) {
      Alert.alert(t('profile.updateError'));
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => {
    setProfile(prev => ({
      ...prev,
      medicalConditions: [...(prev.medicalConditions || []), '']
    }));
  };

  const addMedication = () => {
    setProfile(prev => ({
      ...prev,
      medications: [...(prev.medications || []), '']
    }));
  };

  const updateCondition = (index: number, value: string) => {
    setProfile(prev => ({
      ...prev,
      medicalConditions: prev.medicalConditions?.map((item, i) => 
        i === index ? value : item
      ) || []
    }));
  };

  const updateMedication = (index: number, value: string) => {
    setProfile(prev => ({
      ...prev,
      medications: prev.medications?.map((item, i) => 
        i === index ? value : item
      ) || []
    }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Title title={t('profile.personalInfo')} />
          <Card.Content>
            <TextInput
              mode="outlined"
              label={t('profile.enterName')}
              value={profile.name}
              onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label={t('profile.enterAge')}
              value={profile.age.toString()}
              onChangeText={(text) => setProfile(prev => ({ ...prev, age: parseInt(text) || 0 }))}
              keyboardType="numeric"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title={t('profile.medicalInfo')} />
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('profile.conditions')}
            </Text>
            {profile.medicalConditions?.map((condition, index) => (
              <TextInput
                key={`condition-${index}`}
                mode="outlined"
                value={condition}
                placeholder={t('profile.enterCondition')}
                onChangeText={(text) => updateCondition(index, text)}
                style={styles.input}
              />
            ))}
            <Button
              mode="outlined"
              onPress={addCondition}
              style={styles.button}
            >
              {t('profile.addCondition')}
            </Button>

            <Text variant="titleMedium" style={[styles.sectionTitle, styles.topSpacing]}>
              {t('profile.medications')}
            </Text>
            {profile.medications?.map((medication, index) => (
              <TextInput
                key={`medication-${index}`}
                mode="outlined"
                value={medication}
                placeholder={t('profile.enterMedication')}
                onChangeText={(text) => updateMedication(index, text)}
                style={styles.input}
              />
            ))}
            <Button
              mode="outlined"
              onPress={addMedication}
              style={styles.button}
            >
              {t('profile.addMedication')}
            </Button>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={saveProfile}
          disabled={loading}
          style={styles.saveButton}
        >
          {t('profile.save')}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  topSpacing: {
    marginTop: 16,
  },
  saveButton: {
    marginTop: 16,
  },
});

export default ProfileScreen;