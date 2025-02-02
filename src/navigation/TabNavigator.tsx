
import RemindersScreen from '@/features/reminders/screens/RemindersScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import HealthScreen from '../features/health/screens/HealthScreen';
import { useTheme } from '../context/ThemeContext';
import { ProfileStack } from './ProfileStack';
import SOSScreen from '@/features/emergency/screens/SOSScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: isDark ? '#60A5FA' : '#2563EB', // blue-400 : blue-600
        tabBarInactiveTintColor: isDark ? '#E5E7EB' : '#4B5563', // gray-200 : gray-600
        tabBarStyle: {
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF', // gray-800 : white
          borderTopWidth: 1,
          borderTopColor: isDark ? '#374151' : '#E5E7EB', // gray-700 : gray-200
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
        name="Reminders" 
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
        name="Profile" 
        component={ProfileStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
