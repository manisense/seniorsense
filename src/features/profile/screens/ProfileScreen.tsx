import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Card, TextInput, Button, Text, IconButton, Divider, ProgressBar, List, Avatar } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { CustomDialog } from '@/components/CustomDialog';
import { useAuth } from '@/context/AuthContext';
import { profileService, ProfileData } from '@/services/profileService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    age: 0,
    blood_type: '',
    phone_number: '',
    email: '',
    medical_conditions: [],
    medications: [],
    allergies: [],
    preferred_notification_time: '09:00',
    language: 'en'
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [dialogType, setDialogType] = useState<'condition' | 'medication' | 'allergy'>('condition');
  const [newItem, setNewItem] = useState('');

  // Calculate profile completeness
  const calculateCompleteness = () => {
    const fields = Object.entries(profile).filter(([key]) => 
      !['id', 'user_id', 'created_at', 'updated_at'].includes(key)
    );
    
    const filledFields = fields.filter(([_, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== '';
    });
    
    return filledFields.length / fields.length;
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await profileService.getProfile();
      
      if (error) {
        console.error('Error loading profile:', error);
        Alert.alert(t('profile.loadError'));
        return;
      }
      
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error in loadProfile:', error);
      Alert.alert(t('profile.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) {
      Alert.alert(t('profile.authRequired'));
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await profileService.updateProfile(profile);
      
      if (error) {
        console.error('Error saving profile:', error);
        Alert.alert(t('profile.updateError'));
        return;
      }
      
      setIsEditing(false);
      Alert.alert(t('profile.updateSuccess'));
    } catch (error) {
      console.error('Error in saveProfile:', error);
      Alert.alert(t('profile.updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    
    setProfile(prev => {
      const updatedProfile = { ...prev };
      
      switch (dialogType) {
        case 'condition':
          updatedProfile.medical_conditions = [...(prev.medical_conditions || []), newItem.trim()];
          break;
        case 'medication':
          updatedProfile.medications = [...(prev.medications || []), newItem.trim()];
          break;
        case 'allergy':
          updatedProfile.allergies = [...(prev.allergies || []), newItem.trim()];
          break;
      }
      
      return updatedProfile;
    });
    
    setNewItem('');
    setShowAddDialog(false);
  };

  const handleDeleteItem = (type: 'medical_conditions' | 'medications' | 'allergies', index: number) => {
    setProfile(prev => {
      const updatedProfile = { ...prev };
      const array = updatedProfile[type] || [];
      
      updatedProfile[type] = [
        ...array.slice(0, index),
        ...array.slice(index + 1)
      ];
      
      return updatedProfile;
    });
  };

  const openAddDialog = (type: 'condition' | 'medication' | 'allergy') => {
    setDialogType(type);
    setNewItem('');
    setShowAddDialog(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.text, marginTop: 16 }}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

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
          disabled={isSaving}
          loading={isSaving}
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
            value={profile.full_name || ''}
            onChangeText={(text) => setProfile(prev => ({ ...prev, full_name: text }))}
            disabled={!isEditing}
            style={styles.input}
            mode="outlined"
          />
          
          <View style={styles.row}>
            <TextInput
              label={t('profile.age')}
              value={profile.age?.toString() || ''}
              onChangeText={(text) => setProfile(prev => ({ ...prev, age: parseInt(text) || undefined }))}
              keyboardType="numeric"
              disabled={!isEditing}
              style={[styles.input, styles.flex1]}
              mode="outlined"
            />
            <TextInput
              label={t('profile.bloodType')}
              value={profile.blood_type || ''}
              onChangeText={(text) => setProfile(prev => ({ ...prev, blood_type: text }))}
              disabled={!isEditing}
              style={[styles.input, styles.flex1]}
              mode="outlined"
            />
          </View>

          <TextInput
            label={t('profile.phone')}
            value={profile.phone_number || ''}
            onChangeText={(text) => setProfile(prev => ({ ...prev, phone_number: text }))}
            keyboardType="phone-pad"
            disabled={!isEditing}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label={t('profile.email')}
            value={profile.email || ''}
            onChangeText={(text) => setProfile(prev => ({ ...prev, email: text }))}
            keyboardType="email-address"
            disabled={!isEditing || !!user?.email}
            style={styles.input}
            mode="outlined"
          />
        </Card.Content>
      </Card>

      {/* Medical Information */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={{ color: theme.colors.text }}>
              {t('profile.medicalConditions')}
            </Text>
            {isEditing && (
              <IconButton
                icon="plus"
                size={20}
                onPress={() => openAddDialog('condition')}
                mode="contained"
                containerColor={theme.colors.primaryContainer}
                iconColor={theme.colors.primary}
              />
            )}
          </View>
          
          {(!profile.medical_conditions || profile.medical_conditions.length === 0) ? (
            <Text style={{ color: theme.colors.textSecondary, fontStyle: 'italic' }}>
              {t('profile.noConditions')}
            </Text>
          ) : (
            profile.medical_conditions.map((condition, index) => (
              <View key={`condition-${index}`} style={styles.itemContainer}>
                <Text style={{ color: theme.colors.text }}>{condition}</Text>
                {isEditing && (
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleDeleteItem('medical_conditions', index)}
                    iconColor={theme.colors.error}
                  />
                )}
              </View>
            ))
          )}

          <Divider style={styles.divider} />

          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={{ color: theme.colors.text }}>
              {t('profile.medications')}
            </Text>
            {isEditing && (
              <IconButton
                icon="plus"
                size={20}
                onPress={() => openAddDialog('medication')}
                mode="contained"
                containerColor={theme.colors.primaryContainer}
                iconColor={theme.colors.primary}
              />
            )}
          </View>
          
          {(!profile.medications || profile.medications.length === 0) ? (
            <Text style={{ color: theme.colors.textSecondary, fontStyle: 'italic' }}>
              {t('profile.noMedications')}
            </Text>
          ) : (
            profile.medications.map((medication, index) => (
              <View key={`medication-${index}`} style={styles.itemContainer}>
                <Text style={{ color: theme.colors.text }}>{medication}</Text>
                {isEditing && (
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleDeleteItem('medications', index)}
                    iconColor={theme.colors.error}
                  />
                )}
              </View>
            ))
          )}

          <Divider style={styles.divider} />

          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={{ color: theme.colors.text }}>
              {t('profile.allergies')}
            </Text>
            {isEditing && (
              <IconButton
                icon="plus"
                size={20}
                onPress={() => openAddDialog('allergy')}
                mode="contained"
                containerColor={theme.colors.primaryContainer}
                iconColor={theme.colors.primary}
              />
            )}
          </View>
          
          {(!profile.allergies || profile.allergies.length === 0) ? (
            <Text style={{ color: theme.colors.textSecondary, fontStyle: 'italic' }}>
              {t('profile.noAllergies')}
            </Text>
          ) : (
            profile.allergies.map((allergy, index) => (
              <View key={`allergy-${index}`} style={styles.itemContainer}>
                <Text style={{ color: theme.colors.text }}>{allergy}</Text>
                {isEditing && (
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleDeleteItem('allergies', index)}
                    iconColor={theme.colors.error}
                  />
                )}
              </View>
            ))
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 16,
  },
  settingsButton: {
    marginTop: 8,
  }
});

export default ProfileScreen;
