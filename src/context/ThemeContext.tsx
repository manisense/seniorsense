import React, { createContext, useContext, useState, useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper'

const customColors = {
  primary: '#2196F3',
  secondary: '#757575',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  gray4: '#BDBDBD',
  gray8: '#424242',
  gray9: '#212121',
};

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...customColors,
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#000000',
    border: customColors.gray4,
    shadow: customColors.gray8,
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...customColors,
    background: '#121212',
    surface: '#121212',
    text: '#FFFFFF',
    border: customColors.gray9,
    shadow: customColors.gray8,
  },
};

interface ThemeContextType {
  theme: typeof lightTheme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');

  useEffect(() => {
    setIsDark(colorScheme === 'dark');
  }, [colorScheme]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;