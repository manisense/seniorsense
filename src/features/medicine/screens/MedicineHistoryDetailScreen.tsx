import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, ScrollView, Share, Alert } from 'react-native';
import { Text, Surface, Card, Button, ActivityIndicator, IconButton, TextInput } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { medicineHistoryService, MedicineHistoryItem } from '../../../services/supabase';
import { medicineHistoryLocalService } from '../../../services/medicineHistoryLocalService';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import Tts from 'react-native-tts';
import { format } from 'date-fns';
import NetInfo from '@react-native-community/netinfo';

type RouteParams = {
  id: string;
};

const MedicineHistoryDetailScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { id } = route.params;
  
  const [historyItem, setHistoryItem] = useState<MedicineHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  useEffect(() => {
    // Check network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    
    loadHistoryItem();
    
    // Initialize TTS
    Tts.addEventListener('tts-start', () => setIsSpeaking(true));
    Tts.addEventListener('tts-finish', () => setIsSpeaking(false));
    Tts.addEventListener('tts-cancel', () => setIsSpeaking(false));
    
    return () => {
      // Clean up listeners
      unsubscribe();
      Tts.removeAllListeners('tts-start');
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
      
      // Stop speaking if navigating away
      if (isSpeaking) {
        Tts.stop();
      }
    };
  }, []);

  const loadHistoryItem = async () => {
    setLoading(true);
    try {
      // Try to get from local storage first
      let item = await medicineHistoryLocalService.getMedicineHistoryById(id);
      
      // If not found locally and we have internet, try Supabase
      // This no longer throws errors, just returns null if not authenticated
      if (!item && isConnected) {
        item = await medicineHistoryService.getMedicineHistoryById(id);
      }
      
      if (item) {
        setHistoryItem(item);
        setNotes(item.notes || '');
      }
    } catch (error) {
      console.error('Error loading medicine history item:', error);
      Alert.alert(t('common.error', 'Error'), t('medicineIdentifier.loadError', 'Failed to load medicine details'));
    } finally {
      setLoading(false);
    }
  };

  // Save notes for the medicine
  const saveNotes = async () => {
    if (!historyItem) return;
    
    setIsSavingNotes(true);
    try {
      const updatedItem = {
        ...historyItem,
        notes: notes,
        updated_at: new Date().toISOString()
      };
      
      // Save locally first - this should always work
      const localSaveSuccess = await medicineHistoryLocalService.updateMedicineHistory(updatedItem);
      
      let supabaseSaveSuccess = false;
      
      // If connected, try to save to Supabase (which now handles auth errors internally)
      if (isConnected) {
        try {
          supabaseSaveSuccess = await medicineHistoryService.updateMedicineHistory(updatedItem);
        } catch (supabaseError) {
          console.error('Error saving notes to Supabase:', supabaseError);
          // Continue even if Supabase save fails
        }
      }
      
      // Update the item in state if either save was successful
      if (localSaveSuccess || supabaseSaveSuccess) {
        setHistoryItem(updatedItem);
        
        // Show success message
        Alert.alert(t('common.success', 'Success'), t('medicineIdentifier.notesSaved', 'Notes saved successfully'));
      } else {
        Alert.alert(t('common.error', 'Error'), t('medicineIdentifier.notesSaveError', 'Failed to save notes'));
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      Alert.alert(t('common.error', 'Error'), t('medicineIdentifier.notesSaveError', 'Failed to save notes'));
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Get TTS language code from language code
  const getLanguageForTts = (langCode: string): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'es': 'es-ES',
      'fr': 'fr-FR'
    };
    return langMap[langCode] || 'en-US';
  };

  const handleShare = async () => {
    if (!historyItem) return;
    
    try {
      await Share.share({
        message: `${historyItem.medicine_name}\n\n${historyItem.response_text}${notes ? '\n\nNotes: ' + notes : ''}`,
        title: historyItem.medicine_name,
      });
    } catch (error) {
      console.error('Error sharing medicine info:', error);
    }
  };

  const handleCopy = async () => {
    if (!historyItem) return;
    
    try {
      await Clipboard.setStringAsync(historyItem.response_text);
      Alert.alert(t('common.success', 'Success'), t('medicineIdentifier.copySuccess', 'Text copied to clipboard'));
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleSpeak = () => {
    if (!historyItem) return;
    
    if (isSpeaking) {
      Tts.stop();
      return;
    }
    
    // Set language based on the history item's language (default to en-US)
    const language = getLanguageForTts(historyItem.language) || 'en-US';
    
    Tts.setDefaultLanguage(language)
      .then(() => {
        Tts.speak(historyItem.response_text);
      })
      .catch(err => {
        console.error('Error setting TTS language:', err);
        // Fallback to speaking in English
        Tts.setDefaultLanguage('en-US')
          .then(() => Tts.speak(historyItem.response_text));
      });
  };

  const handleDelete = async () => {
    if (!historyItem) return;
    
    Alert.alert(
      t('medicineIdentifier.deleteConfirm', 'Delete Medicine'),
      t('medicineIdentifier.deleteConfirmMessage', 'Are you sure you want to delete this medicine information?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { 
          text: t('common.delete', 'Delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from local storage first
              const localDeleteSuccess = await medicineHistoryLocalService.deleteMedicineHistory(historyItem.id);
              
              let supabaseDeleteSuccess = false;
              
              // If connected, try to delete from Supabase
              if (isConnected) {
                try {
                  supabaseDeleteSuccess = await medicineHistoryService.deleteMedicineHistory(historyItem.id);
                } catch (supabaseError) {
                  console.error('Error deleting from Supabase:', supabaseError);
                  // Continue even if Supabase delete fails
                }
              }
              
              // Go back to the history screen if either delete was successful
              if (localDeleteSuccess || supabaseDeleteSuccess) {
                navigation.goBack();
              } else {
                Alert.alert(t('common.error', 'Error'), t('medicineIdentifier.deleteError', 'Failed to delete medicine information'));
              }
            } catch (error) {
              console.error('Error deleting history item:', error);
              Alert.alert(t('common.error', 'Error'), t('medicineIdentifier.deleteError', 'Failed to delete medicine information'));
            }
          }
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            {t('medicineIdentifier.loading', 'Loading medicine details...')}
          </Text>
        </View>
      </Surface>
    );
  }

  if (!historyItem) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {t('medicineIdentifier.notFound', 'Medicine information not found')}
          </Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            {t('medicineIdentifier.back', 'Go Back')}
          </Button>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content>
            <Text 
              variant="headlineMedium" 
              style={[styles.medicineName, { color: theme.colors.primary }]}
            >
              {historyItem.medicine_name}
            </Text>
            
            <Text 
              style={[styles.dateText, { color: theme.colors.textSecondary }]}
            >
              {formatDate(historyItem.created_at)}
            </Text>
            
            {historyItem.image_url && (
              <Image 
                source={{ uri: historyItem.image_url }} 
                style={styles.image}
                resizeMode="contain"
              />
            )}
            
            <Card style={[styles.responseCard, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Text style={[styles.responseText, { color: theme.colors.text }]}>
                  {historyItem.response_text}
                </Text>
              </Card.Content>
            </Card>
            
            <Card style={[styles.notesCard, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                  {t('medicineIdentifier.notes', 'Notes')}
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('medicineIdentifier.addNotes', 'Add notes about this medicine...')}
                  multiline
                  numberOfLines={4}
                  style={styles.notesInput}
                  mode="outlined"
                />
                <Button 
                  mode="contained" 
                  onPress={saveNotes}
                  style={styles.saveNotesButton}
                  loading={isSavingNotes}
                  disabled={isSavingNotes}
                >
                  {t('common.save', 'Save Notes')}
                </Button>
              </Card.Content>
            </Card>
            
            <View style={styles.actionsContainer}>
              <Button 
                mode="contained-tonal"
                icon={isSpeaking ? "volume-off" : "volume-high"}
                onPress={handleSpeak}
                style={styles.actionButton}
              >
                {isSpeaking ? t('common.stop', 'Stop') : t('medicineIdentifier.speak', 'Listen')}
              </Button>
              
              <Button 
                mode="contained-tonal"
                icon="content-copy"
                onPress={handleCopy}
                style={styles.actionButton}
              >
                {t('medicineIdentifier.copy', 'Copy')}
              </Button>
              
              <Button 
                mode="contained-tonal"
                icon="share"
                onPress={handleShare}
                style={styles.actionButton}
              >
                {t('common.share', 'Share')}
              </Button>
            </View>
            
            <Button 
              mode="outlined"
              icon="delete"
              onPress={handleDelete}
              style={styles.deleteButton}
              textColor={theme.colors.error}
            >
              {t('medicineIdentifier.delete', 'Delete from History')}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
  },
  medicineName: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  responseCard: {
    borderRadius: 12,
    marginBottom: 16,
  },
  notesCard: {
    borderRadius: 12,
    marginBottom: 16,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'justify',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notesInput: {
    marginBottom: 16,
  },
  saveNotesButton: {
    marginBottom: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  deleteButton: {
    borderColor: '#F44336',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 16,
  },
});

export default MedicineHistoryDetailScreen; 