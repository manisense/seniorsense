import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, View, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { Card, TextInput, Button, Text, ActivityIndicator, useTheme as usePaperTheme } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../context/AuthContext';
import { AuthErrorType } from '../../../services/auth.service';

export const SignUpScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();
  const paperTheme = usePaperTheme();
  const { t } = useTranslation();
  const { signUp, error, loading, clearError } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

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
        case AuthErrorType.WEAK_PASSWORD:
          setPasswordError(error.message);
          break;
        case AuthErrorType.EMAIL_IN_USE:
          setEmailError(error.message);
          break;
      }
    }
  }, [error]);

  const validateInputs = (): boolean => {
    let isValid = true;
    
    // Clear previous errors
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    
    // Validate name
    if (!fullName.trim()) {
      setNameError(t('auth.nameRequired'));
      isValid = false;
    }
    
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
    } else if (password.length < 6) {
      setPasswordError(t('auth.passwordTooShort'));
      isValid = false;
    }
    
    // Validate confirm password
    if (password !== confirmPassword) {
      setConfirmPasswordError(t('auth.passwordsDoNotMatch'));
      isValid = false;
    }
    
    return isValid;
  };

  const handleSignUp = async () => {
    if (!validateInputs()) return;
    
    try {
      const success = await signUp(email, password, fullName);
      
      if (success) {
        Alert.alert(
          t('auth.signUpSuccess'),
          t('auth.verifyEmail'),
          [
            {
              text: t('common.ok'),
              onPress: () => navigation.navigate('SignIn')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Sign up error:', error);
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
              <Text style={[styles.title, { color: theme.colors.text }]}>{t('auth.signUp')}</Text>
              
              <TextInput
                label={t('auth.name')}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  setNameError('');
                }}
                mode="outlined"
                style={styles.input}
                error={!!nameError}
                theme={paperTheme}
                
              />
              {nameError ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{nameError}</Text> : null}
              
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
              
              <TextInput
                label={t('auth.confirmPassword')}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setConfirmPasswordError('');
                }}
                mode="outlined"
                secureTextEntry={!showConfirmPassword}
                style={styles.input}
                error={!!confirmPasswordError}
                theme={paperTheme}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    color={theme.colors.primary}
                  />
                }
              />
              {confirmPasswordError ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{confirmPasswordError}</Text> : null}
              
              <Button
                mode="contained"
                onPress={handleSignUp}
                disabled={loading}
                style={[styles.button, { backgroundColor: loading ? theme.colors.disabled : theme.colors.primary }]}
                labelStyle={{ color: theme.colors.onPrimary }}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.onPrimary} size="small" />
                ) : (
                  t('auth.signUp')
                )}
              </Button>
              
              <View style={styles.signInContainer}>
                <Text style={{ color: theme.colors.text }}>{t('auth.haveAccount')}</Text>
                <TouchableOpacity onPress={navigateToSignIn}>
                  <Text style={{ color: theme.colors.primary, marginLeft: 5, fontWeight: 'bold' }}>
                    {t('auth.signIn')}
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
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    padding: 8,
  },
});