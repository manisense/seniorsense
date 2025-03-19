import NetInfo from '@react-native-community/netinfo';

/**
 * Checks if the device has an active internet connection
 * @returns Promise<boolean> resolving to whether the device is connected to the internet
 */
export const isConnected = async (): Promise<boolean> => {
  try {
    const netInfoState = await NetInfo.fetch();
    return netInfoState.isConnected === true && netInfoState.isInternetReachable === true;
  } catch (error) {
    console.error('Error checking network connectivity:', error);
    return false;
  }
};

/**
 * Adds a listener for network state changes
 * @param onChange Function to call when network state changes
 * @returns Unsubscribe function
 */
export const addNetworkListener = (
  onChange: (isConnected: boolean) => void
): (() => void) => {
  return NetInfo.addEventListener((state) => {
    const connected = state.isConnected === true && state.isInternetReachable === true;
    onChange(connected);
  });
}; 