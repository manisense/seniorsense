import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, TextInput, Button, Text, IconButton } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { ProfileTypes } from '../types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Main: undefined;
  Settings: undefined;
  ProfileScreen: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PROFILE_STORAGE_KEY = 'user_profile';

export const ProfileScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <Text style={[styles.title, { color: theme.colors.primary }]}>Profile</Text>
        <IconButton
          icon="cog"
          size={24}
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        />
      </View>
      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="Name"
            value={profile.name}
            onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
            style={styles.input}
          />
          <TextInput
            label="Age"
            value={String(profile.age)}
            onChangeText={(text) => setProfile(prev => ({ ...prev, age: parseInt(text) || 0 }))}
            keyboardType="numeric"
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={saveProfile}
            loading={loading}
            style={styles.button}
          >
            Save Profile
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    margin: 0,
  },
  settingsButton: {
    margin: 0,
  },
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 16,
  },
});

export default ProfileScreen;
