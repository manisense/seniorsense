import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, TextInput, Button, Text, IconButton, Portal, Dialog, Divider } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { STORAGE_KEYS, ProfileType, DEFAULT_PROFILE } from '../constants';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/StackNavigator';
import { CustomDialog } from '@/components/CustomDialog';
import { ProgressBar, List, Avatar } from 'react-native-paper';
import * as Contacts from 'expo-contacts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileType>({
    name: '',
    age: 0,
    phone: '',
    email: '',
    medicalConditions: [],
    medications: [],
    emergencyContacts: [],
    bloodType: '',
    allergies: [],
    preferredNotificationTime: '09:00',
    language: 'en'
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [dialogType, setDialogType] = useState<'condition' | 'medication' | 'allergy'>('condition');
  const [newItem, setNewItem] = useState('');

  // Calculate profile completeness
  const calculateCompleteness = () => {
    const fields = Object.entries(profile);
    const filledFields = fields.filter(([_, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== '' && value !== 0;
    });
    return filledFields.length / fields.length;
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert(t('profile.loadError'));
    }
  };

  const saveProfile = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
      setIsEditing(false);
      Alert.alert(t('profile.updateSuccess'));
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert(t('profile.updateError'));
    }
  };

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    
    setProfile(prev => {
      switch (dialogType) {
        case 'condition':
          return { ...prev, medicalConditions: [...prev.medicalConditions, newItem.trim()] };
        case 'medication':
          return { ...prev, medications: [...prev.medications, newItem.trim()] };
        case 'allergy':
          return { ...prev, allergies: [...prev.allergies, newItem.trim()] };
        default:
          return prev;
      }
    });
    
    setNewItem('');
    setShowAddDialog(false);
  };

  const handleDeleteItem = (type: string, index: number) => {
    setProfile(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const pickContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const contact = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
        });
        // Handle selected contact
      }
    } catch (error) {
      Alert.alert(t('profile.contactError'));
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.text }}>
          {t('profile.title')}
        </Text>
        <IconButton
          icon={isEditing ? 'content-save' : 'pencil'}
          mode="contained"
          onPress={() => isEditing ? saveProfile() : setIsEditing(true)}
          containerColor={theme.colors.primaryContainer}
          iconColor={theme.colors.primary}
        />
      </View>

      {/* Profile Completeness */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: theme.colors.text, marginBottom: 8 }}>
            {t('profile.completeness')}
          </Text>
          <ProgressBar
            progress={calculateCompleteness()}
            color={theme.colors.primary}
            style={styles.progressBar}
          />
        </Card.Content>
      </Card>

      {/* Personal Information */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: theme.colors.text, marginBottom: 16 }}>
            {t('profile.personalInfo')}
          </Text>
          
          <TextInput
            label={t('profile.name')}
            value={profile.name}
            onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
            disabled={!isEditing}
            style={styles.input}
            mode="outlined"
          />
          
          <View style={styles.row}>
            <TextInput
              label={t('profile.age')}
              value={profile.age.toString()}
              onChangeText={(text) => setProfile(prev => ({ ...prev, age: parseInt(text) || 0 }))}
              keyboardType="numeric"
              disabled={!isEditing}
              style={[styles.input, styles.flex1]}
              mode="outlined"
            />
            <TextInput
              label={t('profile.bloodType')}
              value={profile.bloodType}
              onChangeText={(text) => setProfile(prev => ({ ...prev, bloodType: text }))}
              disabled={!isEditing}
              style={[styles.input, styles.flex1]}
              mode="outlined"
            />
          </View>

          <TextInput
            label={t('profile.phone')}
            value={profile.phone}
            onChangeText={(text) => setProfile(prev => ({ ...prev, phone: text }))}
            keyboardType="phone-pad"
            disabled={!isEditing}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label={t('profile.email')}
            value={profile.email}
            onChangeText={(text) => setProfile(prev => ({ ...prev, email: text }))}
            keyboardType="email-address"
            disabled={!isEditing}
            style={styles.input}
            mode="outlined"
          />
        </Card.Content>
      </Card>

      {/* Medical Information */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: theme.colors.text, marginBottom: 16 }}>
            {t('profile.medicalInfo')}
          </Text>
          
          <View style={styles.section}>
            <Text variant="titleSmall" style={{ color: theme.colors.text, marginBottom: 8 }}>
              {t('profile.conditions')}
            </Text>
            {profile.medicalConditions.map((condition, index) => (
              <View key={index} style={styles.itemContainer}>
                <Text style={{ color: theme.colors.text }}>{condition}</Text>
                {isEditing && (
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleDeleteItem('medicalConditions', index)}
                  />
                )}
              </View>
            ))}
            {isEditing && (
              <Button
                mode="outlined"
                onPress={() => {
                  setDialogType('condition');
                  setShowAddDialog(true);
                }}
                style={styles.addButton}
              >
                {t('profile.addCondition')}
              </Button>
            )}
          </View>

          <Divider style={styles.divider} />

          {/* Similar sections for Medications and Allergies */}
          {/* ... */}
        </Card.Content>
      </Card>

      {/* Settings Button */}
      <Button
        mode="outlined"
        onPress={() => navigation.navigate('Settings')}
        style={styles.settingsButton}
        icon="cog"
      >
        {t('profile.settings')}
      </Button>

      {/* Add Dialog */}
      <CustomDialog
        visible={showAddDialog}
        onDismiss={() => setShowAddDialog(false)}
        title={t(`profile.add${dialogType.charAt(0).toUpperCase() + dialogType.slice(1)}`)}
        content={
          <TextInput
            value={newItem}
            onChangeText={setNewItem}
            label={t(`profile.enter${dialogType.charAt(0).toUpperCase() + dialogType.slice(1)}`)}
            mode="outlined"
            style={[styles.input, { backgroundColor: theme.colors.surfaceVariant || '#F1F5F9' }]}
            textColor={theme.colors.text || '#1E293B'}
            outlineColor={theme.colors.outline || '#CBD5E1'}
            activeOutlineColor={theme.colors.primary || '#2563EB'}
          />
        }
        actions={[
          {
            label: t('common.cancel'),
            onPress: () => setShowAddDialog(false),
          },
          {
            label: t('common.add'),
            onPress: handleAddItem,
          },
        ]}
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addButton: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  settingsButton: {
    marginTop: 8,
  }
});

export default ProfileScreen;
