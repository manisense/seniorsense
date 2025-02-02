import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Card, TextInput, Button, Text } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { AuthService } from '../../../services/auth.service';

export const SignInScreen = ({ navigation }: { navigation: any }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState<any>(null);

  const validatePhoneNumber = (number: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(number);
  };

  const handlePhoneNumberChange = (text: string) => {
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, '');
    setPhoneNumber(cleaned);
  };

  const handleSendOTP = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert(t('auth.error'), t('auth.invalidPhone'));
      return;
    }
    
    try {
      const formattedPhone = `+91${phoneNumber}`;
      const result = await AuthService.signInWithPhoneNumber(formattedPhone);
      if (result.success) {
        setConfirmation(result.confirmation);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      Alert.alert(t('auth.error'), errorMessage);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      const result = await AuthService.verifyOTP(confirmation.verificationId, otp);
      if (result.success) {
        // Navigate to the profile screen after successful verification
        navigation.replace('Profile');
      } else {
        Alert.alert(t('auth.error'), t('auth.invalidOTP'));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      Alert.alert(t('auth.error'), errorMessage);
    }
  };

  const handleResendOTP = async () => {
    setOtp('');
    setConfirmation(null);
    handleSendOTP();
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            {t('auth.signIn')}
          </Text>

          {!confirmation ? (
            <>
              <View style={styles.phoneContainer}>
                <Text variant="titleMedium" style={styles.prefix}>+91</Text>
                <TextInput
                  mode="outlined"
                  style={styles.phoneInput}
                  placeholder={t('auth.phoneNumber')}
                  value={phoneNumber}
                  onChangeText={handlePhoneNumberChange}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>

              <Text variant="bodySmall" style={styles.helperText}>
                {t('auth.phoneHelper')}
              </Text>

              <Button
                mode="contained"
                onPress={handleSendOTP}
                disabled={phoneNumber.length !== 10}
                style={styles.button}
              >
                {t('auth.sendOTP')}
              </Button>
            </>
          ) : (
            <>
              <TextInput
                mode="outlined"
                placeholder={t('auth.otpCode')}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.input}
              />

              <Text variant="bodySmall" style={styles.helperText}>
                {t('auth.otpHelper')}
              </Text>

              <Button
                mode="contained"
                onPress={handleVerifyOTP}
                disabled={otp.length !== 6}
                style={styles.button}
              >
                {t('auth.verifyOTP')}
              </Button>

              <Button
                mode="outlined"
                onPress={handleResendOTP}
                style={styles.resendButton}
              >
                {t('auth.resendOTP')}
              </Button>
            </>
          )}
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  prefix: {
    marginRight: 8,
    alignSelf: 'center',
  },
  phoneInput: {
    flex: 1,
  },
  input: {
    marginBottom: 8,
  },
  helperText: {
    marginBottom: 16,
    opacity: 0.7,
  },
  button: {
    marginBottom: 8,
  },
  resendButton: {
    marginTop: 8,
  },
});