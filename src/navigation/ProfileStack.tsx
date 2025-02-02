import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { SignInScreen } from '../features/auth/screens/SignInScreen';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

export const ProfileStack = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator>
      {!isAuthenticated ? (
        <Stack.Screen 
          name="SignIn" 
          component={SignInScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <Stack.Screen 
          name="ProfileDetails" 
          component={ProfileScreen}
          options={{ headerTitle: 'Profile' }}
        />
      )}
    </Stack.Navigator>
  );
};