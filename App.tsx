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
import { TranslationProvider } from './src/context/TranslationContext';
import { reminderService } from './src/services/reminderService';
import { notificationService } from './src/services/notificationService';
import { addNetworkListener } from './src/utils/networkUtils';
import { LogBox } from 'react-native';
import supabase from './src/services/supabase';
import { setupRemindersTable } from './src/services/setupDatabase';

// Ignore specific annoying warnings if needed
LogBox.ignoreLogs(['Warning: ...']); // Customize this for specific warnings

export default function App() {
  // Log environment variables for debugging
  useEffect(() => {
    console.log('Environment variables loaded:', {
      GEMINI_API_KEY: Constants.expoConfig?.extra?.GEMINI_API_KEY ? 'Set' : 'Not set',
    });
  }, []);

  useEffect(() => {
    // Initialize services
    const initializeApp = async () => {
      try {
        // Set up notification permissions and channels
        await notificationService.requestPermissions();
        await notificationService.initialize();
        
        // Set up reminder service with sync functionality
        await reminderService.initialize();
        
        // Check for and refresh authentication session if needed
        console.log('Checking authentication status...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error during app initialization:', sessionError);
        } else if (!sessionData.session) {
          console.log('No active session found, attempting to refresh...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('Failed to refresh session:', refreshError);
          } else if (refreshData.session) {
            console.log('Session refreshed successfully!');
          } else {
            console.log('No session available after refresh attempt');
          }
        } else {
          console.log('Active session found for user:', sessionData.session.user.email);
        }
        
        // Check if user is authenticated and verify database structure
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('User authenticated on app start, checking database structure...');
          // Attempt to set up the database structure if needed
          // We don't need to await this as it can run in the background
          setupRemindersTable().then(success => {
            if (success) {
              console.log('Database structure verified/updated successfully');
            } else {
              console.warn('Database structure check failed, some features may not work correctly');
            }
          }).catch(error => {
            console.error('Error checking database structure:', error);
          });
        }
        
        // Set up network connectivity listener for sync
        const unsubscribe = addNetworkListener(async (isConnected) => {
          if (isConnected) {
            console.log('Internet connection restored, syncing reminders...');
            await reminderService.syncReminders();
          }
        });
        
        // Cleanup function
        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing app services:', error);
      }
    };
    
    initializeApp();
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <TranslationProvider>
          <PaperProvider theme={DarkTheme}>
            <SafeAreaProvider>
              <NavigationContainer>
                <AuthProvider>
                  <StackNavigator />
                </AuthProvider>
              </NavigationContainer>
            </SafeAreaProvider>
          </PaperProvider>
        </TranslationProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}