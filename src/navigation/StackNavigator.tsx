import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import ProfileScreen from '@/features/profile/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import FeedDetailScreen from '@/screens/FeedDetailScreen';
import { useTheme } from '@/context/ThemeContext';

export type RootStackParamList = {
  MainTabs: undefined;
  Profile: undefined;
  Settings: undefined;
  FeedDetail: { item: any };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const StackNavigator = () => {
  const { theme } = useTheme();

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
    </Stack.Navigator>
  );
};