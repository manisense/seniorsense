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
import { TabParamList, RootStackParamList } from './types';
import { useAuth } from '@/context/AuthContext';
import { profileService, ProfileData } from '@/services/profileService';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const Tab = createBottomTabNavigator<TabParamList>();

export const Header = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await profileService.getProfile();
      if (error) {
        console.error('Error loading profile in Header:', error);
      }
      
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error in loadProfile (Header):', error);
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = isLoading 
    ? 'Loading...' 
    : profile?.full_name || user?.email?.split('@')[0] || 'Guest';

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
              {displayName}
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
            <MaterialCommunityIcons name="animation-play" size={size} color={color} />
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
