import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SignInScreen } from '../features/auth/screens/SignInScreen';
import { SignUpScreen } from '../features/auth/screens/SignUpScreen';
import { EmergencyScreen } from '../features/emergency/screens/EmergencyScreen';
import SOSScreen from '../features/emergency/screens/SOSScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import RemindersScreen from '../features/reminders/screens/RemindersScreen';
import HealthScreen from '../features/health/screens/HealthScreen';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

const ProfileStackNavigator = () => {
  const { isAuthenticated } = useAuth();

  return (
    <ProfileStack.Navigator>
      {!isAuthenticated ? (
        <ProfileStack.Screen 
          name="SignIn" 
          component={SignInScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <ProfileStack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ headerTitle: 'Profile' }}
        />
      )}
    </ProfileStack.Navigator>
  );
};

const RootNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Reminders" component={RemindersScreen} />
      <Tab.Screen name="Health" component={HealthScreen} />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

export default RootNavigator;
