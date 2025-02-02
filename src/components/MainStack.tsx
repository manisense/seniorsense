import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen  from '../screens/HomeScreen';
import SettingsScreen  from '../screens/SettingsScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import RemindersScreen  from '../features/reminders/screens/RemindersScreen';
import SOSScreen  from '../features/emergency/screens/SOSScreen';
import HealthScreen  from '../features/health/screens/HealthScreen';

const Stack = createNativeStackNavigator();

export const MainStack = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#000',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Reminders" component={RemindersScreen} />
        <Stack.Screen name="SOS" component={SOSScreen} />
        <Stack.Screen name="Health" component={HealthScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
