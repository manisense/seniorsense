#!/bin/bash

# 1. Fix App entry point
cat > App.tsx << 'EOL'
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import RootNavigator from './src/navigation';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <NavigationContainer>
      <LanguageProvider>
        <ThemeProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </ThemeProvider>
      </LanguageProvider>
    </NavigationContainer>
  );
}
EOL

# 2. Fix navigation structure
mkdir -p src/navigation
cat > src/navigation/index.tsx << 'EOL'
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EmergencyScreen } from '../features/emergency/screens/EmergencyScreen';
import { SOSScreen } from '../features/emergency/screens/SOSScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Emergency">
      <Stack.Screen name="Emergency" component={EmergencyScreen} />
      <Stack.Screen name="SOS" component={SOSScreen} />
    </Stack.Navigator>
  );
}
EOL

# 3. Fix theme types and constants
mkdir -p src/theme/constants
cat > src/theme/constants/theme.ts << 'EOL'
import { Theme } from '../types/theme.types';

export const lightTheme: Theme = {
  colors: {
    primary: '#007AFF',
    background: '#FFFFFF',
    card: '#F2F2F2',
    text: '#000000',
    border: '#E5E5E5',
    notification: '#FF3B30',
    error: '#FF3B30',
    success: '#34C759',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    fontSize: {
      small: 12,
      medium: 16,
      large: 20,
      extraLarge: 24,
    },
  },
};

export const darkTheme: Theme = {
  // ... dark theme configuration
};
EOL

# 4. Create emergency service
mkdir -p src/services/emergency
cat > src/services/emergency/emergency.service.ts << 'EOL'
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { EmergencyContact } from '../../types';

export const triggerSOS = async (contacts: EmergencyContact[]) => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    const location = await Location.getCurrentPositionAsync({});
    const message = `EMERGENCY: I need help! My location: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
    
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('SMS not available');
    }

    await SMS.sendSMSAsync(
      contacts.map(contact => contact.phone),
      message
    );
  } catch (error) {
    throw error;
  }
};
EOL

# 5. Fix package.json scripts
sed -i '' 's/"start": "expo start"/"start": "expo start --clear"/g' package.json

# 6. Clean and rebuild
echo "Cleaning project..."
rm -rf node_modules
rm -rf .expo
yarn install

echo "Project structure fixed and dependencies reinstalled."
echo "Run 'yarn start' to start the development server."