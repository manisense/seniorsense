import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { StackNavigator } from './navigation/StackNavigator';
import { reminderService, setAuthContextInstance } from './services/reminderService';
import supabase from './services/supabase';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { authService } from './services/auth.service';
import { notificationService } from './services/notificationService';
import { reminderSyncService } from './services/reminderSyncService';
import { pillReminderBackgroundService } from './services/pillReminderBackgroundService';

/**
 * Main app initialization component
 * Handles session setup and initialization
 */
const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const auth = useAuth();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        
        // Set auth context instance for reminder service
        setAuthContextInstance(auth);
        
        // Initialize notification service
        await notificationService.initialize();
        console.log('Notification service initialized');
        
        // Initialize pill reminder background service
        const backgroundServiceResult = await pillReminderBackgroundService.registerBackgroundTask();
        console.log('Pill reminder background service initialized:', backgroundServiceResult ? 'success' : 'failed');
        
        // Check and verify current session
        if (auth.isAuthenticated) {
          console.log('User is authenticated, verifying session...');
          await auth.verifySession();
        }
        
        // Initialize reminder service
        await reminderService.initialize();
        console.log('Reminder service initialized');
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        setInitError(`Initialization error: ${error instanceof Error ? error.message : String(error)}`);
        setIsInitialized(true); // Set to true to show error screen instead of loading
      }
    };

    initializeApp();
  }, [auth]);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', marginBottom: 16 }}>Error</Text>
        <Text>{initError}</Text>
      </View>
    );
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <PaperProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <AppInitializer>
                <StackNavigator />
              </AppInitializer>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 14,
    color: '#666',
  },
});
