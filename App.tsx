import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import TabNavigator from './src/navigation/TabNavigator';
import { Provider as PaperProvider} from 'react-native-paper';
import { ThemeProvider } from './src/context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <PaperProvider theme={DarkTheme}>
        <SafeAreaProvider>
          <NavigationContainer>
            <AuthProvider>
              <TabNavigator />
            </AuthProvider>
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    </ThemeProvider>
  );
}