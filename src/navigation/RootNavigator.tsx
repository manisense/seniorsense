import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from '../navigation/TabNavigator';
export type MainStackParamList = {
  MainTabs: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export const RootNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};
