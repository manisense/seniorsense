import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SettingsScreen from '../screens/SettingsScreen';
import MedicineIdentifierScreen from '../features/medicine/screens/MedicineIdentifierScreen';
import MedicineHistoryScreen from '../features/medicine/screens/MedicineHistoryScreen';
import MedicineHistoryDetailScreen from '../features/medicine/screens/MedicineHistoryDetailScreen';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AuthStack } from './AuthStack';
import TabNavigator from './TabNavigator';

export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  MedicineIdentifier: undefined;
  MedicineHistory: undefined;
  MedicineHistoryDetail: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const StackNavigator = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();

  return (
    <>
      {user ? (
        <Stack.Navigator
          initialRouteName="MainTabs"
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.primary,
            },
            headerTintColor: theme.colors.onPrimary,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            contentStyle: {
              backgroundColor: theme.colors.background,
            },
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: t('navigation.settings') }}
          />
          <Stack.Screen
            name="MedicineIdentifier"
            component={MedicineIdentifierScreen}
            options={{ title: t('medicineIdentifier.title') }}
          />
          <Stack.Screen
            name="MedicineHistory"
            component={MedicineHistoryScreen}
            options={{ title: t('medicineIdentifier.history') }}
          />
          <Stack.Screen
            name="MedicineHistoryDetail"
            component={MedicineHistoryDetailScreen}
            options={{ title: t('medicineIdentifier.historyDetail') }}
          />
        </Stack.Navigator>
      ) : (
        <AuthStack />
      )}
    </>
  );
};