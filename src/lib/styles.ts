import { StyleSheet } from 'react-native';

export const createStyleSheet = (styles: Record<string, any>) => {
  return StyleSheet.create(styles);
};

export const cn = (...classNames: (string | undefined | null | false)[]) => {
  // For React Native, we'll return an empty object as styles should be handled by StyleSheet
  return {};
};