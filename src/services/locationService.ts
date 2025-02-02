import * as Location from 'expo-location';

export const locationService = {
  async requestPermissions() {
    return await Location.requestForegroundPermissionsAsync();
  },

  async getCurrentPosition() {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  },
};