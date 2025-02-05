import React, { createContext, useContext, useState, useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from '@/features/profile/constants'

const baseElevation = {
  level0: 'transparent',
  level1: 'rgba(0, 0, 0, 0.05)',
  level2: 'rgba(0, 0, 0, 0.08)',
  level3: 'rgba(0, 0, 0, 0.11)',
  level4: 'rgba(0, 0, 0, 0.12)',
  level5: 'rgba(0, 0, 0, 0.14)',
};

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563EB',
    primaryContainer: '#DBEAFE',
    secondary: '#4F46E5',
    secondaryContainer: '#E0E7FF',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9',
    error: '#DC2626',
    success: '#16A34A',
    warning: '#FBBF24',
    text: '#1E293B',
    textSecondary: '#64748B',
    outline: '#CBD5E1',
    disabled: '#94A3B8',
    elevation: baseElevation,
  },
  elevation: baseElevation,
}

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#60A5FA',
    primaryContainer: '#1E40AF',
    secondary: '#818CF8',
    secondaryContainer: '#3730A3',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceVariant: '#334155',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    outline: '#475569',
    disabled: '#64748B',
    elevation: baseElevation,
  },
  elevation: baseElevation,
}

export type CustomTheme = typeof lightTheme

interface ThemeContextType {
  theme: CustomTheme
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
})

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false)
  const [theme, setTheme] = useState(lightTheme)

  useEffect(() => {
    loadThemePreference()
  }, [])

  useEffect(() => {
    setTheme(isDark ? darkTheme : lightTheme)
  }, [isDark])

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(STORAGE_KEYS.THEME)
      if (savedTheme) {
        setIsDark(savedTheme === 'dark')
      }
    } catch (error) {
      console.error('Error loading theme preference:', error)
    }
  }

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark
      await AsyncStorage.setItem(STORAGE_KEYS.THEME, newTheme ? 'dark' : 'light')
      setIsDark(newTheme)
    } catch (error) {
      console.error('Error saving theme preference:', error)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

export default ThemeContext