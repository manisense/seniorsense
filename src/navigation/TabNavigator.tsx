import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import FeedScreen from '../screens/FeedScreen';
import HealthScreen from '../features/health/screens/HealthScreen';
import RemindersScreen from '@/features/reminders/screens/RemindersScreen';
import SOSScreen from '@/features/emergency/screens/SOSScreen';
import { useTheme } from '../context/ThemeContext';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, DEFAULT_PROFILE, ProfileType } from '../features/profile/constants';
import { TabParamList } from './types';

type RootStackParamList = {
  Main: undefined;
  Profile: undefined;
};

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const Tab = createBottomTabNavigator<TabParamList>();

export const Header = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const [profile, setProfile] = useState<ProfileType>(DEFAULT_PROFILE);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        setProfile(parsedProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  return (
    <SafeAreaView style={[
      styles.header, 
      { backgroundColor: theme?.colors?.surface || '#FFFFFF' }
    ]}>
      <View style={styles.headerContent}>
        <TouchableRipple onPress={() => navigation.navigate('Profile')}>
          <View style={styles.profileSection}>
            <MaterialCommunityIcons 
              name="account-circle" 
              size={36} 
              color={theme?.colors?.primary || '#2563EB'} 
            />
            <Text style={[
              styles.userName, 
              { color: theme?.colors?.text || '#000000' }
            ]}>
              {profile?.name || 'User'}
            </Text>
          </View>
        </TouchableRipple>
        <TouchableRipple onPress={() => navigation.navigate('Settings')}>
          <MaterialCommunityIcons 
            name="cog" 
            size={32} 
            color={theme?.colors?.primary || '#2563EB'} 
          />
        </TouchableRipple>
      </View>
    </SafeAreaView>
  );
};

const TabNavigator = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        header: () => <Header />,
        tabBarStyle: {
          backgroundColor: theme?.colors?.surface || '#FFFFFF',
          borderTopColor: theme?.colors?.outline || '#E5E5E5',
          height: 60,
        },
        tabBarActiveTintColor: theme?.colors?.primary || '#2563EB',
        tabBarInactiveTintColor: theme?.colors?.textSecondary || '#64748B',
        tabBarLabelStyle: {
          fontSize: 16,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Feed" 
        component={FeedScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="rss" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Health" 
        component={HealthScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Reminder" 
        component={RemindersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="alarm" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="SOS" 
        component={SOSScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="alert-circle" size={size} color={color} />
          ),
          tabBarLabel: 'SOS',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  header: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
  },
});

export default TabNavigator;
