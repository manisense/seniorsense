import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right'
        }}
      />
    </Stack.Navigator>
  );
};



export default RootNavigator;
