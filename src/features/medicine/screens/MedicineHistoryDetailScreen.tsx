import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, ScrollView, Share, Alert } from 'react-native';
import { Text, Surface, Card, Button, ActivityIndicator, IconButton } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { medicineHistoryService, MedicineHistoryItem } from '../../../services/supabase';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import Tts from 'react-native-tts';
import { format } from 'date-fns';

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

  useEffect(() => {
    loadHistoryItem();
    
    // Initialize TTS
    Tts.addEventListener('tts-start', () => setIsSpeaking(true));
    Tts.addEventListener('tts-finish', () => setIsSpeaking(false));
    Tts.addEventListener('tts-cancel', () => setIsSpeaking(false));
    
    return () => {
      // Clean up TTS listeners
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
      const data = await medicineHistoryService.getMedicineHistoryById(id);
      setHistoryItem(data);
    } catch (error) {
      console.error('Error loading medicine history item:', error);
      Alert.alert('Error', 'Failed to load medicine details');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!historyItem) return;
    
    try {
      await Share.share({
        message: `${historyItem.medicine_name}\n\n${historyItem.response_text}`,
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
      Alert.alert('Success', t('medicineIdentifier.medicineCopySuccess'));
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
    const language = 'en-US';
    
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
      'Delete History',
      'Are you sure you want to delete this medicine information?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await medicineHistoryService.deleteMedicineHistory(historyItem.id);
              if (success) {
                navigation.goBack();
              } else {
                Alert.alert('Error', 'Failed to delete medicine information');
              }
            } catch (error) {
              console.error('Error deleting history item:', error);
              Alert.alert('Error', 'Failed to delete medicine information');
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
            Loading medicine details...
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
            Medicine information not found
          </Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            Go Back
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
            
            <View style={styles.actionsContainer}>
              <Button 
                mode="contained-tonal"
                icon={isSpeaking ? "volume-off" : "volume-high"}
                onPress={handleSpeak}
                style={styles.actionButton}
              >
                {isSpeaking ? 'Stop' : 'Listen'}
              </Button>
              
              <Button 
                mode="contained-tonal"
                icon="content-copy"
                onPress={handleCopy}
                style={styles.actionButton}
              >
                Copy
              </Button>
              
              <Button 
                mode="contained-tonal"
                icon="share"
                onPress={handleShare}
                style={styles.actionButton}
              >
                Share
              </Button>
            </View>
            
            <Button 
              mode="outlined"
              icon="delete"
              onPress={handleDelete}
              style={styles.deleteButton}
              textColor={theme.colors.error}
            >
              Delete from History
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
  responseText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'justify',
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