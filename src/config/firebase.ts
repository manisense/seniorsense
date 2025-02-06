import { initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  // Your Firebase config here
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence
});

export { auth, app };