import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import ProfileScreen from '@/features/profile/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import FeedDetailScreen from '@/screens/FeedDetailScreen';
import MedicineIdentifierScreen from '@/features/medicine/screens/MedicineIdentifierScreen';
import MedicineHistoryScreen from '@/features/medicine/screens/MedicineHistoryScreen';
import MedicineHistoryDetailScreen from '@/features/medicine/screens/MedicineHistoryDetailScreen';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { AuthStack } from './AuthStack';
import { ActivityIndicator, View } from 'react-native';

export type RootStackParamList = {
  MainTabs: undefined;
  Profile: undefined;
  Settings: undefined;
  FeedDetail: { item: any };
  MedicineIdentifier: undefined;
  MedicineHistory: undefined;
  MedicineHistoryDetail: { id: string };
  Auth: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const StackNavigator = () => {
  const { theme } = useTheme();
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen 
          name="Auth" 
          component={AuthStack}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen 
            name="MainTabs" 
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{
              headerShown: true,
              title: 'Profile'
            }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{
              headerShown: true,
              title: 'Settings'
            }}
          />
          <Stack.Screen 
            name="FeedDetail" 
            component={FeedDetailScreen}
            options={{
              headerShown: true,
              title: 'Article'
            }}
          />
          <Stack.Screen 
            name="MedicineIdentifier" 
            component={MedicineIdentifierScreen} 
            options={{
              headerShown: true,
              title: 'Medicine Identifier'
            }}
          />
          <Stack.Screen 
            name="MedicineHistory" 
            component={MedicineHistoryScreen} 
            options={{
              headerShown: true,
              title: 'Medicine History'
            }}
          />
          <Stack.Screen 
            name="MedicineHistoryDetail" 
            component={MedicineHistoryDetailScreen} 
            options={{
              headerShown: true,
              title: 'Medicine Details'
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};