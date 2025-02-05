import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import RootNavigator from './navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Wrapper component that consumes the theme from ThemeContext
const ThemedApp = () => {
  const { theme } = useTheme();
  return (
    <PaperProvider theme={theme}>
      <LanguageProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </LanguageProvider>
    </PaperProvider>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
