import { 
  PhoneAuthProvider,
  signInWithCredential,
  signOut,
  RecaptchaVerifier
} from 'firebase/auth';
import { auth } from '../config/firebase.config';

export class AuthService {
  static async signInWithPhoneNumber(phoneNumber: string): Promise<any> {
    try {
      const provider = new PhoneAuthProvider(auth);
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {});
      const verificationId = await provider.verifyPhoneNumber(
        phoneNumber,
        recaptchaVerifier
      );
      return { success: true, verificationId };
    } catch (error) {
      return { success: false, error };
    }
  }

  static async verifyOTP(verificationId: string, otp: string): Promise<any> {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      const result = await signInWithCredential(auth, credential);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error };
    }
  }

  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  static getCurrentUser() {
    return auth.currentUser;
  }
}