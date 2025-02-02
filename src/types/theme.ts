import { MD3Theme } from 'react-native-paper';

export interface CustomTheme extends MD3Theme {
  colors: MD3Theme['colors'] & {
    // Add any custom colors here
    primary: string;
    background: string;
    text: string;
  };
}