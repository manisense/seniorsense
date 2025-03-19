import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authService, AuthServiceError, AuthErrorType } from '../services/auth.service';
import supabase from '../services/auth.service';
import { Alert } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { reminderService } from '../services/reminderService';
import { profileService } from '../services/profileService';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthServiceError | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName: string) => Promise<boolean>;
  signOut: () => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;
  updateProfile: (data: Partial<Profile>) => Promise<boolean>;
  clearError: () => void;
  verifySession: () => Promise<boolean>;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  age?: number;
  blood_type?: string;
  avatar_url?: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthServiceError | null>(null);
  const { t } = useTranslation();

  const checkAuth = async () => {
    try {
      setLoading(true);
      
      // First, get the current session
      const { session, error } = await authService.getSession();
      
      if (error) {
        console.log('Error checking session in AuthContext:', error.message);
        setIsAuthenticated(false);
        setUser(null);
        setSession(null);
        return;
      }
      
      if (session) {
        // Verify the session is actually valid by making a test request
        try {
          const { data, error: testError } = await supabase
            .from('reminders')
            .select('count')
            .limit(1);
            
          if (testError) {
            console.log('Session appears invalid in test request:', testError.message);
            
            // Session exists but is invalid, try to refresh
            const { session: refreshedSession, error: refreshError } = await authService.refreshSession();
            
            if (refreshError || !refreshedSession) {
              console.log('Failed to refresh invalid session:', refreshError?.message);
              setIsAuthenticated(false);
              setUser(null);
              setSession(null);
              return;
            }
            
            // Refresh successful
            setUser(refreshedSession.user);
            setSession(refreshedSession);
            setIsAuthenticated(true);
            
            // Ensure profile exists for the user
            if (refreshedSession.user) {
              await profileService.ensureProfile(refreshedSession.user);
            }
          } else {
            // Session is valid
            setUser(session.user);
            setSession(session);
            setIsAuthenticated(true);
            
            // Ensure profile exists for the user
            if (session.user) {
              await profileService.ensureProfile(session.user);
            }
          }
        } catch (e) {
          console.error('Error testing session validity:', e);
          setIsAuthenticated(false);
          setUser(null);
          setSession(null);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setSession(null);
      }
    } catch (e) {
      console.error('Error in checkAuth:', e);
      setIsAuthenticated(false);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  // Initialize auth state
  useEffect(() => {
    checkAuth();
    
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
          return;
        }
        
        if (session) {
          // Verify the session is valid
          try {
            const { data, error: testError } = await supabase
              .from('reminders')
              .select('count')
              .limit(1);
              
            if (testError) {
              console.log('New session invalid in test request:', testError.message);
              return;
            }
            
            setUser(session.user);
            setSession(session);
            setIsAuthenticated(true);
            
            // Create or get profile when user logs in
            if (session.user) {
              await profileService.ensureProfile(session.user);
            }
          } catch (e) {
            console.error('Error validating new session:', e);
          }
        } else {
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
        }
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  /**
   * Verify and refresh the session if needed
   * Use this before making any authenticated requests
   */
  const verifySession = async (): Promise<boolean> => {
    try {
      if (!isAuthenticated || !session) {
        console.log('verifySession: No active session');
        return false;
      }
      
      // Check if session is still valid with a test request
      const { error: testError } = await supabase
        .from('reminders')
        .select('count')
        .limit(1);
        
      if (!testError) {
        // Session is still valid
        return true;
      }
      
      console.log('verifySession: Session needs refresh, attempting to refresh...');
      
      // Try to refresh the session
      const { session: refreshedSession, error: refreshError } = await authService.refreshSession();
      
      if (refreshError || !refreshedSession) {
        console.error('verifySession: Failed to refresh session:', refreshError?.message);
        
        // If refresh failed, check if we need to force sign out
        if (refreshError?.message?.includes('Auth session missing')) {
          console.log('verifySession: Auth session missing, signing out...');
          await signOut();
          return false;
        }
        
        return false;
      }
      
      // Update the session state with the refreshed session
      setUser(refreshedSession.user);
      setSession(refreshedSession);
      setIsAuthenticated(true);
      
      console.log('verifySession: Session refreshed successfully');
      return true;
    } catch (error) {
      console.error('verifySession: Error verifying session:', error);
      return false;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const handleError = (error: AuthServiceError | null) => {
    if (error) {
      setError(error);
      
      // Show alert for critical errors
      if (
        error.type === AuthErrorType.NETWORK_ERROR ||
        error.type === AuthErrorType.UNKNOWN_ERROR
      ) {
        Alert.alert(t('auth.error'), error.message);
      }
      
      return false;
    }
    return true;
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      clearError();
      setLoading(true);
      
      const { session, error } = await authService.signIn(email, password);
      
      if (error) {
        handleError(error);
        return false;
      }

      if (session) {
        setUser(session.user);
        setSession(session);
        setIsAuthenticated(true);
        
        // Ensure profile exists
        if (session.user) {
          await profileService.ensureProfile(session.user);
        }
        
        // Sync local reminders to Supabase
        await reminderService.syncReminders();
      }
      
      return true;
    } catch (error) {
      console.error('Error signing in:', error);
      setError(new AuthServiceError('An unexpected error occurred', AuthErrorType.UNKNOWN_ERROR, error));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<boolean> => {
    try {
      clearError();
      setLoading(true);
      
      const { error } = await authService.signUp(email, password, { full_name: fullName });
      
      if (error) {
        handleError(error);
        return false;
      }
      
      // After successful signup, try to get the session
      const { session } = await authService.getSession();
      
      if (session?.user) {
        setUser(session.user);
        setSession(session);
        setIsAuthenticated(true);
        
        // Ensure profile is created
        await profileService.ensureProfile(session.user);
        
        // Sync local reminders to Supabase
        await reminderService.syncReminders();
      }
      
      return true;
    } catch (error) {
      console.error('Error signing up:', error);
      setError(new AuthServiceError('An unexpected error occurred', AuthErrorType.UNKNOWN_ERROR, error));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<boolean> => {
    try {
      setLoading(true);
      clearError();
      
      const { error: signOutError } = await authService.signOut();
      
      if (signOutError) {
        return handleError(signOutError);
      }
      
      setSession(null);
      setUser(null);
      setIsAuthenticated(false);
      
      return true;
    } catch (err) {
      console.error('Error in signOut:', err);
      const authError = err instanceof AuthServiceError 
        ? err 
        : new AuthServiceError(
            'An unexpected error occurred during sign out',
            AuthErrorType.UNKNOWN_ERROR,
            err
          );
      return handleError(authError);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    try {
      clearError();
      setLoading(true);
      
      await authService.signInWithGoogle();
      
      // Get the current session after OAuth login
      const { session, error } = await authService.getSession();
      
      if (error) {
        handleError(error);
        return;
      }
      
      if (session) {
        setUser(session.user);
        setSession(session);
        setIsAuthenticated(true);
        
        // Sync local reminders to Supabase
        await reminderService.syncReminders();
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError(new AuthServiceError('An unexpected error occurred', AuthErrorType.UNKNOWN_ERROR, error));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      setLoading(true);
      clearError();
      
      const { error: resetError } = await authService.resetPassword(email);
      
      if (resetError) {
        return handleError(resetError);
      }
      
      return true;
    } catch (err) {
      console.error('Error in resetPassword:', err);
      const authError = err instanceof AuthServiceError 
        ? err 
        : new AuthServiceError(
            'An unexpected error occurred during password reset',
            AuthErrorType.UNKNOWN_ERROR,
            err
          );
      return handleError(authError);
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    try {
      setLoading(true);
      clearError();
      
      const { error: updateError } = await authService.updatePassword(newPassword);
      
      if (updateError) {
        return handleError(updateError);
      }
      
      return true;
    } catch (err) {
      console.error('Error in updatePassword:', err);
      const authError = err instanceof AuthServiceError 
        ? err 
        : new AuthServiceError(
            'An unexpected error occurred during password update',
            AuthErrorType.UNKNOWN_ERROR,
            err
          );
      return handleError(authError);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<Profile>): Promise<boolean> => {
    try {
      setLoading(true);
      clearError();
      
      if (!user) {
        const authError = new AuthServiceError(
          'You must be logged in to update your profile',
          AuthErrorType.USER_NOT_FOUND
        );
        return handleError(authError);
      }
      
      // Use profile service instead of direct update
      const { error } = await profileService.updateProfile({
        full_name: data.full_name,
        email: data.email,
        phone_number: data.phone_number,
        age: data.age,
        blood_type: data.blood_type,
        language: data.language,
      });
      
      if (error) {
        return handleError(new AuthServiceError(
          'Failed to update profile',
          AuthErrorType.UNKNOWN_ERROR,
          error
        ));
      }
      
      return true;
    } catch (err) {
      console.error('Error in updateProfile:', err);
      const authError = err instanceof AuthServiceError 
        ? err 
        : new AuthServiceError(
            'An unexpected error occurred during profile update',
            AuthErrorType.UNKNOWN_ERROR,
            err
          );
      return handleError(authError);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    isAuthenticated,
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    updateProfile,
    clearError,
    verifySession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};