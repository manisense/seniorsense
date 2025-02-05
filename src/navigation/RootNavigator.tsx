import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
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
            animation: 'slide_from_right'
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
