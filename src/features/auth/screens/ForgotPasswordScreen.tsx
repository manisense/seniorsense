import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, Alert, StatusBar } from 'react-native';
import { Card, TextInput, Button, Text, ActivityIndicator, useTheme as usePaperTheme } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../context/AuthContext';
import { AuthErrorType } from '../../../services/auth.service';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export const ForgotPasswordScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();
  const paperTheme = usePaperTheme();
  const { t } = useTranslation();
  const { resetPassword, error, loading, clearError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Clear any auth errors when component unmounts
  useEffect(() => {
    return () => {
      if (clearError) clearError();
    };
  }, [clearError]);

  // Update UI errors based on auth context errors
  useEffect(() => {
    if (error) {
      switch (error.type) {
        case AuthErrorType.INVALID_EMAIL:
          setEmailError(error.message);
          break;
        case AuthErrorType.USER_NOT_FOUND:
          setEmailError(error.message);
          break;
      }
    }
  }, [error]);

  const validateInputs = (): boolean => {
    let isValid = true;
    
    // Clear previous errors
    setEmailError('');
    
    // Validate email
    if (!email) {
      setEmailError(t('auth.emailRequired'));
      isValid = false;
    } else if (!email.includes('@')) {
      setEmailError(t('auth.invalidEmail'));
      isValid = false;
    }
    
    return isValid;
  };

  const handleResetPassword = async () => {
    if (!validateInputs()) return;
    
    try {
      const success = await resetPassword(email);
      
      if (success) {
        setResetSent(true);
      }
    } catch (error) {
      console.error('Password reset error:', error);
    }
  };

  const navigateToSignIn = () => {
    navigation.navigate('SignIn');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar backgroundColor={theme.colors.background} barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image 
              source={require('./../../../assets/icon.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.appTitle, { color: theme.colors.primary }]}>
              {t('app.name')}
            </Text>
          </View>
          
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={4}>
            <Card.Content>
              <Text style={[styles.title, { color: theme.colors.text }]}>{t('auth.resetPassword')}</Text>
              
              {!resetSent ? (
                <>
                  <Text style={[styles.instructions, { color: theme.colors.text }]}>
                    {t('auth.resetInstructions')}
                  </Text>
                  
                  <TextInput
                    label={t('auth.email')}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setEmailError('');
                    }}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                    error={!!emailError}
                    theme={paperTheme}
                  />
                  {emailError ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{emailError}</Text> : null}
                  
                  <Button
                    mode="contained"
                    onPress={handleResetPassword}
                    disabled={loading}
                    style={[styles.button, { backgroundColor: loading ? theme.colors.disabled : theme.colors.primary }]}
                    labelStyle={{ color: theme.colors.onPrimary }}
                  >
                    {loading ? (
                      <ActivityIndicator color={theme.colors.onPrimary} size="small" />
                    ) : (
                      t('auth.sendResetLink')
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <View style={styles.successContainer}>
                    <MaterialCommunityIcons 
                      name="email-check" 
                      size={64} 
                      color={theme.colors.primary} 
                    />
                    <Text style={[styles.successText, { color: theme.colors.text }]}>
                      {t('auth.resetLinkSent')}
                    </Text>
                    <Text style={[styles.successSubText, { color: theme.colors.text, opacity: 0.7 }]}>
                      {t('auth.checkEmail')}
                    </Text>
                  </View>
                  
                  <Button
                    mode="contained"
                    onPress={navigateToSignIn}
                    style={[styles.button, { backgroundColor: theme.colors.primary }]}
                    labelStyle={{ color: theme.colors.onPrimary }}
                  >
                    {t('auth.backToSignIn')}
                  </Button>
                </>
              )}
              
              {!resetSent && (
                <TouchableOpacity
                  style={styles.backToSignIn}
                  onPress={navigateToSignIn}
                >
                  <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                    {t('auth.backToSignIn')}
                  </Text>
                </TouchableOpacity>
              )}
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  card: {
    borderRadius: 12,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructions: {
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 8,
    marginTop: -4,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backToSignIn: {
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
  },
  successContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  successSubText: {
    marginTop: 8,
    textAlign: 'center',
  },
}); 