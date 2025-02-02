import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import SOSScreen  from '../features/emergency/screens/SOSScreen';

const Stack = createNativeStackNavigator();

export const StackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="SOS" 
        component={SOSScreen}
        options={{
          headerStyle: {
            backgroundColor: '#FF3B30',
          },
          headerTintColor: '#fff',
        }}
      />
    </Stack.Navigator>
  );
};