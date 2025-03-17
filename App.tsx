import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import TabNavigator from './src/navigation/TabNavigator';
import { Provider as PaperProvider} from 'react-native-paper';
import { ThemeProvider } from './src/context/ThemeContext';
import { StackNavigator } from '@/navigation/StackNavigator';
import { LanguageProvider } from './src/context/LanguageContext';
import Constants from 'expo-constants';

export default function App() {
  // Log environment variables for debugging
  useEffect(() => {
    console.log('Environment variables loaded:', {
      GEMINI_API_KEY: Constants.expoConfig?.extra?.GEMINI_API_KEY ? 'Set' : 'Not set',
    });
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <PaperProvider theme={DarkTheme}>
          <SafeAreaProvider>
            <NavigationContainer>
              <AuthProvider>
                <StackNavigator />
              </AuthProvider>
            </NavigationContainer>
          </SafeAreaProvider>
        </PaperProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}