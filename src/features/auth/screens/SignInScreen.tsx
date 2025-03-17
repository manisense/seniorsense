import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, View, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { Card, TextInput, Button, Text, ActivityIndicator, useTheme as usePaperTheme } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../context/AuthContext';
import { AuthErrorType } from '../../../services/auth.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const SignInScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();
  const paperTheme = usePaperTheme();
  const { t } = useTranslation();
  const { signIn, signInWithGoogle, error, loading, clearError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
        case AuthErrorType.INVALID_CREDENTIALS:
          setPasswordError(error.message);
          break;
        case AuthErrorType.EMAIL_NOT_CONFIRMED:
          Alert.alert(t('auth.error'), error.message);
          break;
      }
    }
  }, [error, t]);

  const validateInputs = (): boolean => {
    let isValid = true;
    
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    
    // Validate email
    if (!email) {
      setEmailError(t('auth.emailRequired'));
      isValid = false;
    } else if (!email.includes('@')) {
      setEmailError(t('auth.invalidEmail'));
      isValid = false;
    }
    
    // Validate password
    if (!password) {
      setPasswordError(t('auth.passwordRequired'));
      isValid = false;
    }
    
    return isValid;
  };

  const handleSignIn = async () => {
    if (!validateInputs()) return;
    
    try {
      const success = await signIn(email, password);
      
      if (success) {
        // Navigation will be handled by the auth state change in the navigator
        console.log('Sign in successful');
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign in error:', error);
    }
  };

  const navigateToSignUp = () => {
    navigation.navigate('SignUp');
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword');
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
              <Text style={[styles.title, { color: theme.colors.text }]}>{t('auth.signIn')}</Text>
              
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
              
              <View style={styles.passwordContainer}>
                <TextInput
                  label={t('auth.password')}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError('');
                  }}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  error={!!passwordError}
                  theme={paperTheme}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                      color={theme.colors.primary}
                    />
                  }
                />
                {passwordError ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{passwordError}</Text> : null}
              </View>
              
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={navigateToForgotPassword}
              >
                <Text style={{ color: theme.colors.primary }}>
                  {t('auth.forgotPassword')}
                </Text>
              </TouchableOpacity>
              
              <Button
                mode="contained"
                onPress={handleSignIn}
                disabled={loading}
                style={[styles.button, { backgroundColor: loading ? theme.colors.disabled : theme.colors.primary }]}
                labelStyle={{ color: theme.colors.onPrimary }}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.onPrimary} size="small" />
                ) : (
                  t('auth.signIn')
                )}
              </Button>
              
              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.outline }]} />
                <Text style={[styles.dividerText, { color: theme.colors.text }]}>{t('auth.orContinueWith')}</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.outline }]} />
              </View>
              
              <Button
                mode="outlined"
                onPress={handleGoogleSignIn}
                icon="google"
                style={[styles.googleButton, { borderColor: theme.colors.outline }]}
                disabled={loading}
                labelStyle={{ color: theme.colors.text }}
              >
                {t('auth.continueWithGoogle')}
              </Button>
              
              <View style={styles.signUpContainer}>
                <Text style={{ color: theme.colors.text }}>{t('auth.noAccount')}</Text>
                <TouchableOpacity onPress={navigateToSignUp}>
                  <Text style={{ color: theme.colors.primary, marginLeft: 5, fontWeight: 'bold' }}>
                    {t('auth.signUp')}
                  </Text>
                </TouchableOpacity>
              </View>
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
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff'
  },
  passwordContainer: {
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 8,
    marginTop: -4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    padding: 4,
  },
  button: {
    marginBottom: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 8,
  },
  googleButton: {
    marginBottom: 16,
    borderRadius: 8,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    padding: 8,
  },
});