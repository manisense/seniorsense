import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import FeedScreen from '../screens/FeedScreen';
import HealthScreen from '../features/health/screens/HealthScreen';
import RemindersScreen from '@/features/reminders/screens/RemindersScreen';
import SOSScreen from '@/features/emergency/screens/SOSScreen';
import { useTheme } from '../context/ThemeContext';

type RootStackParamList = {
  MainTabs: undefined;
  Profile: undefined;
};

type TabParamList = {
  Home: undefined;
  Feed: undefined;
  Health: undefined;
  Reminders: undefined;
  SOS: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Tab = createBottomTabNavigator<TabParamList>();

const Header = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isDark } = useTheme();
  
  return (
    <SafeAreaView style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
      }}>
        <Text style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: isDark ? '#F9FAFB' : '#111827',
        }}>
          SeniorSense
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <MaterialCommunityIcons 
            name="account-circle" 
            size={24} 
            color={isDark ? '#F9FAFB' : '#111827'}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        header: () => <Header />
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
        }}
      />
    </Tab.Navigator>
  );
};

export { Header };
export default TabNavigator;
