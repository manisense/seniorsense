import { createClient, SupabaseClient, User, Session, AuthError, AuthResponse } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { storageService } from './storage/storage.service';

// Constants for storage keys
const AUTH_STORAGE_KEY = 'supabase.auth.token';
const SESSION_STORAGE_KEY = 'supabase.auth.session';
const USER_STORAGE_KEY = 'supabase.auth.user';

// Error types for better error handling
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'invalid_credentials',
  EMAIL_NOT_CONFIRMED = 'email_not_confirmed',
  USER_NOT_FOUND = 'user_not_found',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error',
  INVALID_EMAIL = 'invalid_email',
  WEAK_PASSWORD = 'weak_password',
  EMAIL_IN_USE = 'email_in_use',
  EXPIRED_SESSION = 'expired_session',
  OAUTH_ERROR = 'oauth_error',
}

// Custom error class for authentication errors
export class AuthServiceError extends Error {
  type: AuthErrorType;
  originalError?: any;

  constructor(message: string, type: AuthErrorType, originalError?: any) {
    super(message);
    this.name = 'AuthServiceError';
    this.type = type;
    this.originalError = originalError;
  }
}

// Create a single supabase client for interacting with your database
const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
    storage: {
      getItem: async (key) => {
        try {
          return await AsyncStorage.getItem(key);
        } catch (error) {
          console.error(`Error getting item from storage: ${key}`, error);
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          await AsyncStorage.setItem(key, value);
        } catch (error) {
          console.error(`Error setting item in storage: ${key}`, error);
        }
      },
      removeItem: async (key) => {
        try {
          await AsyncStorage.removeItem(key);
        } catch (error) {
          console.error(`Error removing item from storage: ${key}`, error);
        }
      },
    },
  },
});

// Helper function to parse Supabase errors
const parseSupabaseError = (error: AuthError | null): AuthServiceError => {
  if (!error) {
    return new AuthServiceError(
      'An unknown error occurred',
      AuthErrorType.UNKNOWN_ERROR
    );
  }

  // Parse the error message and code to determine the type
  const message = error.message;
  
  if (message.includes('Invalid login credentials')) {
    return new AuthServiceError(
      'Invalid email or password',
      AuthErrorType.INVALID_CREDENTIALS,
      error
    );
  } else if (message.includes('Email not confirmed')) {
    return new AuthServiceError(
      'Please confirm your email before signing in',
      AuthErrorType.EMAIL_NOT_CONFIRMED,
      error
    );
  } else if (message.includes('User not found')) {
    return new AuthServiceError(
      'No account found with this email',
      AuthErrorType.USER_NOT_FOUND,
      error
    );
  } else if (message.includes('network')) {
    return new AuthServiceError(
      'Network error. Please check your connection',
      AuthErrorType.NETWORK_ERROR,
      error
    );
  } else if (message.includes('Password should be')) {
    return new AuthServiceError(
      'Password must be at least 6 characters',
      AuthErrorType.WEAK_PASSWORD,
      error
    );
  } else if (message.includes('already registered')) {
    return new AuthServiceError(
      'This email is already in use',
      AuthErrorType.EMAIL_IN_USE,
      error
    );
  } else if (message.includes('expired')) {
    return new AuthServiceError(
      'Your session has expired. Please sign in again',
      AuthErrorType.EXPIRED_SESSION,
      error
    );
  } else if (message.includes('valid email')) {
    return new AuthServiceError(
      'Please enter a valid email address',
      AuthErrorType.INVALID_EMAIL,
      error
    );
  } else if (message.includes('OAuth')) {
    return new AuthServiceError(
      'Error signing in with social provider',
      AuthErrorType.OAUTH_ERROR,
      error
    );
  }

  return new AuthServiceError(
    message || 'An unknown error occurred',
    AuthErrorType.UNKNOWN_ERROR,
    error
  );
};

// Authentication service
export const authService = {
  // Get current user
  getCurrentUser: async (): Promise<User | null> => {
    try {
      // First try to get from memory
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return user;
      
      // If not in memory, try from storage
      const storedUser = await storageService.get<User>(USER_STORAGE_KEY);
      return storedUser;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },
  
  // Get current session
  getSession: async (): Promise<{ session: Session | null; error: AuthServiceError | null }> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw parseSupabaseError(error);
      }
      
      if (data.session) {
        // Store session in AsyncStorage for persistence
        await storageService.set(SESSION_STORAGE_KEY, data.session);
        await storageService.set(USER_STORAGE_KEY, data.session.user);
      }
      
      return { session: data.session, error: null };
    } catch (error) {
      console.error('Error getting session:', error);
      const authError = error instanceof AuthServiceError 
        ? error 
        : new AuthServiceError(
            'Failed to get session',
            AuthErrorType.UNKNOWN_ERROR,
            error
          );
      return { session: null, error: authError };
    }
  },
  
  // Sign up with email and password
  signUp: async (
    email: string,
    password: string,
    metadata?: { full_name?: string }
  ): Promise<{ user: User | null; error: AuthServiceError | null }> => {
    try {
      // Validate inputs
      if (!email || !email.includes('@')) {
        throw new AuthServiceError(
          'Please enter a valid email address',
          AuthErrorType.INVALID_EMAIL
        );
      }
      
      if (!password || password.length < 6) {
        throw new AuthServiceError(
          'Password must be at least 6 characters',
          AuthErrorType.WEAK_PASSWORD
        );
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        }
      });
      
      if (error) {
        throw parseSupabaseError(error);
      }
      
      return { user: data.user, error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      const authError = error instanceof AuthServiceError 
        ? error 
        : new AuthServiceError(
            'Failed to sign up',
            AuthErrorType.UNKNOWN_ERROR,
            error
          );
      return { user: null, error: authError };
    }
  },
  
  // Sign in with email and password
  signIn: async (
    email: string,
    password: string
  ): Promise<{ session: Session | null; error: AuthServiceError | null }> => {
    try {
      // Validate inputs
      if (!email || !email.includes('@')) {
        throw new AuthServiceError(
          'Please enter a valid email address',
          AuthErrorType.INVALID_EMAIL
        );
      }
      
      if (!password) {
        throw new AuthServiceError(
          'Please enter your password',
          AuthErrorType.INVALID_CREDENTIALS
        );
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw parseSupabaseError(error);
      }
      
      if (data.session) {
        // Store session and user in AsyncStorage for persistence
        await storageService.set(SESSION_STORAGE_KEY, data.session);
        await storageService.set(USER_STORAGE_KEY, data.session.user);
      }
      
      return { session: data.session, error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      const authError = error instanceof AuthServiceError 
        ? error 
        : new AuthServiceError(
            'Failed to sign in',
            AuthErrorType.UNKNOWN_ERROR,
            error
          );
      return { session: null, error: authError };
    }
  },
  
  // Sign in with Google
  signInWithGoogle: async (): Promise<void> => {
    try {
      const redirectUrl = Platform.OS === 'web' 
        ? '/auth/callback'
        : 'seniorwellness://auth/callback';
        
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });
      
      if (error) {
        throw parseSupabaseError(error);
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error instanceof AuthServiceError 
        ? error 
        : new AuthServiceError(
            'Failed to sign in with Google',
            AuthErrorType.OAUTH_ERROR,
            error
          );
    }
  },
  
  // Sign out
  signOut: async (): Promise<{ error: AuthServiceError | null }> => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw parseSupabaseError(error);
      }
      
      // Clear stored session and user
      await storageService.remove(SESSION_STORAGE_KEY);
      await storageService.remove(USER_STORAGE_KEY);
      await storageService.remove(AUTH_STORAGE_KEY);
      
      return { error: null };
    } catch (error) {
      console.error('Error signing out:', error);
      const authError = error instanceof AuthServiceError 
        ? error 
        : new AuthServiceError(
            'Failed to sign out',
            AuthErrorType.UNKNOWN_ERROR,
            error
          );
      return { error: authError };
    }
  },
  
  // Reset password
  resetPassword: async (email: string): Promise<{ error: AuthServiceError | null }> => {
    try {
      // Validate email
      if (!email || !email.includes('@')) {
        throw new AuthServiceError(
          'Please enter a valid email address',
          AuthErrorType.INVALID_EMAIL
        );
      }
      
      const redirectUrl = Platform.OS === 'web'
        ? '/reset-password'
        : 'seniorwellness://reset-password';
        
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      
      if (error) {
        throw parseSupabaseError(error);
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error resetting password:', error);
      const authError = error instanceof AuthServiceError 
        ? error 
        : new AuthServiceError(
            'Failed to send password reset email',
            AuthErrorType.UNKNOWN_ERROR,
            error
          );
      return { error: authError };
    }
  },
  
  // Update password
  updatePassword: async (newPassword: string): Promise<{ error: AuthServiceError | null }> => {
    try {
      // Validate password
      if (!newPassword || newPassword.length < 6) {
        throw new AuthServiceError(
          'Password must be at least 6 characters',
          AuthErrorType.WEAK_PASSWORD
        );
      }
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        throw parseSupabaseError(error);
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error updating password:', error);
      const authError = error instanceof AuthServiceError 
        ? error 
        : new AuthServiceError(
            'Failed to update password',
            AuthErrorType.UNKNOWN_ERROR,
            error
          );
      return { error: authError };
    }
  },
  
  // Update user email
  updateEmail: async (newEmail: string): Promise<{ error: AuthServiceError | null }> => {
    try {
      // Validate email
      if (!newEmail || !newEmail.includes('@')) {
        throw new AuthServiceError(
          'Please enter a valid email address',
          AuthErrorType.INVALID_EMAIL
        );
      }
      
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });
      
      if (error) {
        throw parseSupabaseError(error);
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error updating email:', error);
      const authError = error instanceof AuthServiceError 
        ? error 
        : new AuthServiceError(
            'Failed to update email',
            AuthErrorType.UNKNOWN_ERROR,
            error
          );
      return { error: authError };
    }
  },
  
  // Update user metadata
  updateUserMetadata: async (metadata: Record<string, any>): Promise<{ error: AuthServiceError | null }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: metadata
      });
      
      if (error) {
        throw parseSupabaseError(error);
      }
      
      // Update stored user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await storageService.set(USER_STORAGE_KEY, user);
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error updating user metadata:', error);
      const authError = error instanceof AuthServiceError 
        ? error 
        : new AuthServiceError(
            'Failed to update user metadata',
            AuthErrorType.UNKNOWN_ERROR,
            error
          );
      return { error: authError };
    }
  },
  
  // Refresh session
  refreshSession: async (): Promise<{ session: Session | null; error: AuthServiceError | null }> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw parseSupabaseError(error);
      }
      
      if (data.session) {
        // Store refreshed session
        await storageService.set(SESSION_STORAGE_KEY, data.session);
        await storageService.set(USER_STORAGE_KEY, data.session.user);
      }
      
      return { session: data.session, error: null };
    } catch (error) {
      console.error('Error refreshing session:', error);
      const authError = error instanceof AuthServiceError 
        ? error 
        : new AuthServiceError(
            'Failed to refresh session',
            AuthErrorType.UNKNOWN_ERROR,
            error
          );
      return { session: null, error: authError };
    }
  },
  
  // Set session
  setSession: async (access_token: string, refresh_token: string): Promise<{ error: AuthServiceError | null }> => {
    try {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token
      });
      
      if (error) {
        throw parseSupabaseError(error);
      }
      
      // Update stored session and user
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await storageService.set(SESSION_STORAGE_KEY, session);
        await storageService.set(USER_STORAGE_KEY, session.user);
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error setting session:', error);
      const authError = error instanceof AuthServiceError 
        ? error 
        : new AuthServiceError(
            'Failed to set session',
            AuthErrorType.UNKNOWN_ERROR,
            error
          );
      return { error: authError };
    }
  },
  
  // On auth state change
  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
  
  // Check if user is authenticated
  isAuthenticated: async (): Promise<boolean> => {
    try {
      // Check for current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session in isAuthenticated:', sessionError);
      }
      
      if (session) {
        return true;
      }
      
      // Try to refresh the session
      console.log('No active session found in isAuthenticated, attempting to refresh...');
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Failed to refresh session in isAuthenticated:', refreshError);
          
          // Check for specific error types
          if (refreshError.message.includes('Auth session missing')) {
            console.error('AuthSessionMissingError: Session may be expired or invalid');
            // Try to recover by checking if we have a user even without a valid session
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user) {
              console.log('User exists despite session issues, attempting to force session refresh');
              
              // Get stored tokens if available
              const storedSession = await storageService.get<Session>(SESSION_STORAGE_KEY);
              if (storedSession?.refresh_token) {
                try {
                  // Attempt to explicitly set the session with stored tokens
                  const { error: setSessionError } = await supabase.auth.setSession({
                    access_token: storedSession.access_token,
                    refresh_token: storedSession.refresh_token
                  });
                  
                  if (setSessionError) {
                    console.error('Failed to set session from stored tokens:', setSessionError);
                    return false;
                  }
                  
                  console.log('Successfully restored session from stored tokens');
                  return true;
                } catch (setSessionError) {
                  console.error('Exception when setting session:', setSessionError);
                  return false;
                }
              }
            }
          }
          
          return false;
        }
        
        if (!refreshData.session) {
          console.log('No session returned after refresh in isAuthenticated');
          return false;
        }
        
        console.log('Session refreshed successfully in isAuthenticated');
        return true;
      } catch (refreshError) {
        console.error('Exception during session refresh in isAuthenticated:', refreshError);
        return false;
      }
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  },
  
  // Get user profile
  getUserProfile: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { profile: null, error: new AuthServiceError(
          'User not authenticated',
          AuthErrorType.USER_NOT_FOUND
        )};
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (error) {
        throw error;
      }
      
      return { profile: data, error: null };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { 
        profile: null, 
        error: new AuthServiceError(
          'Failed to get user profile',
          AuthErrorType.UNKNOWN_ERROR,
          error
        )
      };
    }
  }
};

export default supabase;