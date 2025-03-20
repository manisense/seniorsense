import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { View, StyleSheet, Image, ScrollView, Alert, ActivityIndicator, Share, TouchableOpacity, Platform, Modal } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Text, Button, Card, Surface, Snackbar, IconButton, Portal, Chip } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import NetInfo from '@react-native-community/netinfo';
import Tts from 'react-native-tts';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { medicineHistoryService } from '../../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Interface for CustomDialog props
interface CustomDialogProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  content: ReactNode;
  actions: ReactNode;
}

// Custom Dialog component to avoid theme issues
const CustomDialog: React.FC<CustomDialogProps> = ({ visible, onDismiss, title, content, actions }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
          </View>
          <View style={styles.modalContent}>
            {content}
          </View>
          <View style={styles.modalActions}>
            {actions}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const MedicineIdentifierScreen = () => {
  const { theme } = useTheme();
  const { t, locale, setLocale } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(locale || 'en');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [imageQuality, setImageQuality] = useState(0.8);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [savedToHistory, setSavedToHistory] = useState(false);

  // Get API key from Constants
  const GEMINI_API_KEY = Constants.expoConfig?.extra?.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  // Available languages
  const languages = [
    { code: 'en', name: 'English', ttsCode: 'en-US' },
    { code: 'hi', name: 'हिंदी (Hindi)', ttsCode: 'hi-IN' },
    { code: 'es', name: 'Español (Spanish)', ttsCode: 'es-ES' },
    { code: 'fr', name: 'Français (French)', ttsCode: 'fr-FR' },
  ];

  // Initialize TTS
  useEffect(() => {
    // Initialize TTS
    Tts.setDefaultLanguage('en-US');
    Tts.addEventListener('tts-start', () => setIsSpeaking(true));
    Tts.addEventListener('tts-finish', () => setIsSpeaking(false));
    Tts.addEventListener('tts-cancel', () => setIsSpeaking(false));

    // Check network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    return () => {
      // Clean up TTS listeners
      Tts.removeAllListeners('tts-start');
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
      unsubscribe();
    };
  }, []);

  // Request permission to access the camera and media library
  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert(
        t('medicineIdentifier.permissionRequired'),
        t('medicineIdentifier.permissionMessage')
      );
      return false;
    }
    return true;
  };

  // Pick image from gallery
  const pickImage = async () => {
    if (!isConnected) {
      showSnackbar(t('common.noInternet'));
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: imageQuality,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Compress the image before using it
        const compressedImage = await compressImage(result.assets[0].uri);
        setImage(compressedImage);
        
        // Convert to base64 for API
        const base64 = await getBase64(compressedImage);
        setImageBase64(base64);
        
        setResult(null);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), t('medicineIdentifier.pickImageError'));
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    if (!isConnected) {
      showSnackbar(t('common.noInternet'));
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: imageQuality,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Compress the image before using it
        const compressedImage = await compressImage(result.assets[0].uri);
        setImage(compressedImage);
        
        // Convert to base64 for API
        const base64 = await getBase64(compressedImage);
        setImageBase64(base64);
        
        setResult(null);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(t('common.error'), t('medicineIdentifier.cameraError'));
    }
  };

  // Compress image to reduce size
  const compressImage = async (uri: string): Promise<string> => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      // Log the file size for debugging
      const fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
      if (fileInfo.exists && 'size' in fileInfo) {
        console.log(`Compressed image size: ${fileInfo.size / 1024 / 1024} MB`);
      }
      
      return manipResult.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri; // Return original if compression fails
    }
  };

  // Convert image to base64
  const getBase64 = async (uri: string) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  };

  // Identify medicine using Google Gemini API
  const identifyMedicine = async () => {
    if (!image || !imageBase64) return;
    
    if (!isConnected) {
      showSnackbar(t('common.noInternet'));
      return;
    }

    if (!GEMINI_API_KEY) {
      showSnackbar(t('medicineIdentifier.apiKeyMissing'));
      return;
    }
    
    setLoading(true);
    setSavedToHistory(false);
    
    try {
      // Get user's preferred language
      const userLanguage = selectedLanguage || locale || 'en';
      
      // Initialize the Google Generative AI client
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      
      // For Gemini 2.0 Flash
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
      });
      
      // Create prompt
      const prompt = `Identify the medicine in this image and provide a simple, natural description in ${getLanguageName(userLanguage)}.

      Write your response as a single, flowing paragraph without any bullet points, asterisks, or formatting. Do NOT use any introductory phrases like "I can help you" or "This is".
      
      Simply describe what the medicine is, what it's used for, how it's typically taken, and any important side effects to be aware of. Use simple, everyday language as if explaining to an elderly person.
      
      For example, a good response would be like: "The packaging of the medicine indicates that this is a probiotic supplement called VSL#3. Probiotics are used to help maintain a healthy balance of bacteria in the gut, which can be beneficial for digestion and overall health. They may be used to help with conditions like irritable bowel syndrome or to help restore the gut after taking antibiotics."
      
      Keep it concise and conversational, avoiding technical medical terminology where possible.`;
      
      // Prepare the image part
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg"
        }
      };
      
      // Generate content
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      // Clean the text for display and speech
      let cleanedText = text
        .replace(/\*/g, '')
        .replace(/\-/g, '')
        .replace(/•/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/(\d+\.\s+)/g, '')  // Remove numbered list markers like "1. "
        .replace(/([A-Za-z0-9])\:([A-Za-z0-9])/g, '$1: $2')  // Fix spacing after colons
        .trim() || t('medicineIdentifier.noResultFound');
      
      // Remove common introductory phrases
      cleanedText = cleanedText
        .replace(/^(ज़रूर|जरूर|ज़रुर|जरुर),?\s+मैं\s+आपकी\s+मदद\s+कर\s+सकता\s+हूँ।?\s+/i, '')
        .replace(/^मैं\s+आपकी\s+मदद\s+कर\s+सकता\s+हूँ।?\s+/i, '')
        .replace(/^(Sure|I can help you|Let me help you|Let me explain|I'd be happy to help)\.?\s+/i, '')
        .replace(/^(This is|What you're looking at is|This appears to be|This medicine is|Based on the image)\.?\s+/i, '')
        .replace(/^(Generic name|Brand name|Uses|Dosage|Side effects):\s+/i, '')
        .trim();
      
      setResult(cleanedText);
      
      // Save to history
      try {
        // Extract medicine name from the first sentence
        const medicineName = cleanedText.split('.')[0].trim();
        
        // Save to Supabase
        const historyItem = await medicineHistoryService.saveMedicineHistory(
          medicineName,
          cleanedText,
          image
        );
        
        if (historyItem) {
          setSavedToHistory(true);
          console.log('Saved to history with ID:', historyItem.id);
        }
      } catch (historyError) {
        console.error('Error saving to history:', historyError);
        // Continue even if saving to history fails
      }
      
      // Automatically speak the result
      try {
        const ttsLang = getTtsLanguageCode(selectedLanguage);
        await Tts.setDefaultLanguage(ttsLang);
        Tts.speak(cleanedText);
      } catch (error) {
        console.error('Error auto-speaking result:', error);
      }
      
    } catch (error) {
      console.error('Error identifying medicine:', error);
      setResult(t('medicineIdentifier.identificationError'));
    } finally {
      setLoading(false);
    }
  };

  // Get language name for display
  const getLanguageName = (code: string): string => {
    const language = languages.find(lang => lang.code === code);
    return language ? language.name : code;
  };

  // Get TTS language code
  const getTtsLanguageCode = (code: string): string => {
    const language = languages.find(lang => lang.code === code);
    return language ? language.ttsCode : 'en-US';
  };

  // Reset the state
  const resetIdentification = () => {
    if (isSpeaking) {
      Tts.stop();
    }
    setImage(null);
    setImageBase64(null);
    setResult(null);
  };

  // Share the result
  const shareResult = async () => {
    if (!result) return;
    
    try {
      await Share.share({
        message: result,
        title: t('medicineIdentifier.result'),
      });
    } catch (error) {
      console.error('Error sharing result:', error);
      showSnackbar(t('medicineIdentifier.shareError'));
    }
  };

  // Copy result to clipboard
  const copyToClipboard = async () => {
    if (!result) return;
    
    await Clipboard.setStringAsync(result);
    showSnackbar(t('medicineIdentifier.copySuccess'));
  };

  // Save image to gallery
  const saveImageToGallery = async () => {
    if (!image) return;
    
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          t('medicineIdentifier.permissionRequired'),
          t('medicineIdentifier.galleryPermissionMessage')
        );
        return;
      }
      
      await MediaLibrary.saveToLibraryAsync(image);
      showSnackbar(t('medicineIdentifier.imageSaved'));
    } catch (error) {
      console.error('Error saving image to gallery:', error);
      showSnackbar(t('medicineIdentifier.saveImageError'));
    }
  };

  // Show snackbar with message
  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // Speak the result
  const speakResult = async () => {
    if (!result) return;
    
    if (isSpeaking) {
      Tts.stop();
      return;
    }
    
    try {
      // Set the language for TTS
      const ttsLang = getTtsLanguageCode(selectedLanguage);
      await Tts.setDefaultLanguage(ttsLang);
      
      // Clean the text for speech - use the same cleaning as in identifyMedicine
      let cleanedText = result
        .replace(/\*/g, '')
        .replace(/\-/g, '')
        .replace(/•/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/(\d+\.\s+)/g, '')  // Remove numbered list markers like "1. "
        .replace(/([A-Za-z0-9])\:([A-Za-z0-9])/g, '$1: $2')  // Fix spacing after colons
        .trim();
      
      // Remove common introductory phrases
      cleanedText = cleanedText
        .replace(/^(ज़रूर|जरूर|ज़रुर|जरुर),?\s+मैं\s+आपकी\s+मदद\s+कर\s+सकता\s+हूँ।?\s+/i, '')
        .replace(/^मैं\s+आपकी\s+मदद\s+कर\s+सकता\s+हूँ।?\s+/i, '')
        .replace(/^(Sure|I can help you|Let me help you|Let me explain|I'd be happy to help)\.?\s+/i, '')
        .replace(/^(This is|What you're looking at is|This appears to be|This medicine is|Based on the image)\.?\s+/i, '')
        .replace(/^(Generic name|Brand name|Uses|Dosage|Side effects):\s+/i, '')
        .trim();
      
      // Speak the result
      Tts.speak(cleanedText);
    } catch (error) {
      console.error('Error speaking result:', error);
      showSnackbar(t('medicineIdentifier.speakError'));
    }
  };

  // Apply selected language
  const applyLanguage = () => {
    // Only close the dialog without updating the app's locale
    setShowLanguageDialog(false);
    // Don't call setLocale() here to avoid changing the app's language
  };

  // View history
  const viewHistory = () => {
    navigation.navigate('MedicineHistory');
  };

  // Render privacy dialog
  const renderPrivacyDialog = () => {
    return (
      <CustomDialog
        visible={showPrivacyDialog}
        onDismiss={() => setShowPrivacyDialog(false)}
        title={t('medicineIdentifier.privacyTitle')}
        content={
          <Text style={styles.dialogText}>
            {t('medicineIdentifier.privacyContent')}
          </Text>
        }
        actions={
          <Button 
            mode="contained" 
            onPress={() => setShowPrivacyDialog(false)}
            style={styles.dialogButton}
          >
            {t('common.ok')}
          </Button>
        }
      />
    );
  };

  // Render language selection dialog
  const renderLanguageDialog = () => {
    return (
      <CustomDialog
        visible={showLanguageDialog}
        onDismiss={() => setShowLanguageDialog(false)}
        title={t('medicineIdentifier.selectLanguage')}
        content={
          <View style={styles.languageOptions}>
            {languages.map(language => (
              <Chip
                key={language.code}
                selected={selectedLanguage === language.code}
                onPress={() => setSelectedLanguage(language.code)}
                style={[
                  styles.languageChip,
                  selectedLanguage === language.code && { 
                    backgroundColor: theme.colors.primaryContainer || '#E3F2FD' 
                  }
                ]}
              >
                {language.name}
              </Chip>
            ))}
          </View>
        }
        actions={
          <View style={styles.dialogButtonsContainer}>
            <Button 
              mode="outlined" 
              onPress={() => setShowLanguageDialog(false)}
              style={[styles.dialogButton, styles.cancelButton]}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              mode="contained" 
              onPress={applyLanguage}
              style={styles.dialogButton}
            >
              {t('common.apply')}
            </Button>
          </View>
        }
      />
    );
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background || '#F5F5F5' }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={[styles.card, { backgroundColor: theme.colors.surfaceVariant || '#E1E1E1' }]}>
          <Card.Content>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>{t('medicineIdentifier.title')}</Text>
              <IconButton
                icon="history"
                size={24}
                onPress={viewHistory}
                accessibilityLabel={t('medicineIdentifier.viewHistory')}
              />
            </View>
            
            <Text style={[styles.description, { color: theme.colors.textSecondary || '#757575' }]}>
              {t('medicineIdentifier.description')}
            </Text>

            <Chip 
              icon="translate" 
              style={styles.languageChip}
              onPress={() => setShowLanguageDialog(true)}
            >
              {t('medicineIdentifier.resultLanguage')}: {getLanguageName(selectedLanguage)}
            </Chip>
            
            <Chip 
              icon="volume-high" 
              style={styles.autoSpeakChip}
            >
              {t('medicineIdentifier.autoSpeak')}
            </Chip>

            {!image ? (
              <View style={styles.imagePickerContainer}>
                <Button
                  mode="contained"
                  icon="image"
                  onPress={pickImage}
                  style={styles.button}
                >
                  {t('medicineIdentifier.selectImage')}
                </Button>
                <Button
                  mode="contained"
                  icon="camera"
                  onPress={takePhoto}
                  style={styles.button}
                >
                  {t('medicineIdentifier.takePhoto')}
                </Button>
              </View>
            ) : (
              <View style={styles.imagePreviewContainer}>
                {image && (
                  <Image 
                    source={{ uri: image }} 
                    style={styles.imagePreview}
                    resizeMode="contain"
                  />
                )}
                
                {!loading && !result ? (
                  <View style={styles.actionButtonsContainer}>
                    <Button
                      mode="contained"
                      icon="magnify"
                      onPress={identifyMedicine}
                      style={styles.button}
                    >
                      {t('medicineIdentifier.identify')}
                    </Button>
                    <Button
                      mode="outlined"
                      icon="refresh"
                      onPress={resetIdentification}
                      style={styles.button}
                    >
                      {t('common.reset')}
                    </Button>
                    <Button
                      mode="outlined"
                      icon="content-save"
                      onPress={saveImageToGallery}
                      style={styles.button}
                    >
                      {t('medicineIdentifier.saveImage')}
                    </Button>
                  </View>
                ) : null}
              </View>
            )}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary || '#2196F3'} />
                <Text style={[styles.loadingText, { color: theme.colors.text || '#000000' }]}>
                  {t('medicineIdentifier.analyzing')}
                </Text>
              </View>
            )}

            {result && (
              <Card style={[styles.resultCard, { backgroundColor: theme.colors.surface || '#FFFFFF' }]}>
                <Card.Content>
                  <Text variant="titleMedium" style={[styles.resultTitle, { color: theme.colors.primary || '#2196F3' }]}>
                    {t('medicineIdentifier.result')}
                  </Text>
                  <Text style={[styles.resultText, { color: theme.colors.text || '#000000' }]}>
                    {result}
                  </Text>
                  {savedToHistory && (
                    <Chip 
                      icon="check-circle" 
                      style={styles.savedChip}
                    >
                      Saved to history
                    </Chip>
                  )}
                  <View style={styles.resultActions}>
                    <Button
                      mode="contained-tonal"
                      icon={isSpeaking ? "volume-off" : "volume-high"}
                      onPress={speakResult}
                      style={styles.actionButton}
                    >
                      {isSpeaking ? t('medicineIdentifier.stopSpeaking') : t('medicineIdentifier.speak')}
                    </Button>
                    <Button
                      mode="contained-tonal"
                      icon="content-copy"
                      onPress={copyToClipboard}
                      style={styles.actionButton}
                    >
                      {t('medicineIdentifier.copy')}
                    </Button>
                    <Button
                      mode="contained-tonal"
                      icon="share"
                      onPress={shareResult}
                      style={styles.actionButton}
                    >
                      {t('common.share')}
                    </Button>
                  </View>
                  <View style={styles.actionButtonsContainer}>
                    <Button
                      mode="outlined"
                      icon="refresh"
                      onPress={resetIdentification}
                      style={styles.button}
                    >
                      {t('common.tryAgain')}
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            )}

            <View style={styles.disclaimerContainer}>
              <Text style={[styles.disclaimer, { color: theme.colors.textSecondary || '#757575' }]}>
                {t('medicineIdentifier.disclaimer')}
              </Text>
              <TouchableOpacity onPress={() => setShowPrivacyDialog(true)}>
                <Text style={[styles.privacyLink, { color: theme.colors.primary || '#2196F3' }]}>
                  {t('medicineIdentifier.privacyPolicy')}
                </Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: theme.colors.surfaceVariant || '#E1E1E1' }}
      >
        <Text style={{ color: theme.colors.text || '#000000' }}>{snackbarMessage}</Text>
      </Snackbar>

      {renderPrivacyDialog()}
      {renderLanguageDialog()}
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  description: {
    marginBottom: 16,
    textAlign: 'center',
  },
  languageChip: {
    marginBottom: 8,
    alignSelf: 'center',
  },
  autoSpeakChip: {
    marginBottom: 16,
    alignSelf: 'center',
    backgroundColor: '#E3F2FD',
  },
  imagePickerContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginVertical: 24,
  },
  button: {
    width: '100%',
    marginVertical: 8,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginVertical: 16,
    width: '100%',
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  actionButtonsContainer: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  resultCard: {
    marginTop: 16,
    borderRadius: 12,
  },
  resultTitle: {
    marginBottom: 8,
  },
  resultText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'justify',
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  disclaimerContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  privacyLink: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  languageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Custom dialog styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalContent: {
    padding: 16,
  },
  modalActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dialogText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
  },
  dialogButton: {
    minWidth: 100,
  },
  cancelButton: {
    marginRight: 8,
  },
  dialogButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  savedChip: {
    marginBottom: 16,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
  },
});

export default MedicineIdentifierScreen; 