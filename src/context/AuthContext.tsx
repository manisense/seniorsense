import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authService, AuthServiceError, AuthErrorType } from '../services/auth.service';
import supabase from '../services/auth.service';
import { Alert } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';

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

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Check for existing session
        const { session: currentSession, error: sessionError } = await authService.getSession();
        
        if (sessionError) {
          console.warn('Session error:', sessionError);
          // Don't set error here as it's just initialization
        }
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state change listener
    const { data: authListener } = authService.onAuthStateChange(async (event, session) => {
      console.log(`Auth event: ${event}`);
      
      if (session) {
        setSession(session);
        setUser(session.user);
        setIsAuthenticated(true);
      } else {
        setSession(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    // Clean up subscription
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

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
      setLoading(true);
      clearError();
      
      const { session: newSession, error: signInError } = await authService.signIn(email, password);
      
      if (signInError) {
        return handleError(signInError);
      }
      
      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        setIsAuthenticated(true);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error in signIn:', err);
      const authError = err instanceof AuthServiceError 
        ? err 
        : new AuthServiceError(
            'An unexpected error occurred during sign in',
            AuthErrorType.UNKNOWN_ERROR,
            err
          );
      return handleError(authError);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<boolean> => {
    try {
      setLoading(true);
      clearError();
      
      const { user: newUser, error: signUpError } = await authService.signUp(
        email, 
        password, 
        { full_name: fullName }
      );
      
      if (signUpError) {
        return handleError(signUpError);
      }
      
      // Note: User needs to confirm email before they can sign in
      // We don't set isAuthenticated here
      
      return true;
    } catch (err) {
      console.error('Error in signUp:', err);
      const authError = err instanceof AuthServiceError 
        ? err 
        : new AuthServiceError(
            'An unexpected error occurred during sign up',
            AuthErrorType.UNKNOWN_ERROR,
            err
          );
      return handleError(authError);
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
      setLoading(true);
      clearError();
      
      await authService.signInWithGoogle();
      
      // Note: The auth state change listener will handle updating the state
      // when the OAuth flow completes
    } catch (err) {
      console.error('Error in signInWithGoogle:', err);
      const authError = err instanceof AuthServiceError 
        ? err 
        : new AuthServiceError(
            'An unexpected error occurred during Google sign in',
            AuthErrorType.OAUTH_ERROR,
            err
          );
      handleError(authError);
      throw authError; // Re-throw to allow handling in UI
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
      
      // Update user metadata if name is provided
      if (data.full_name) {
        const { error: metadataError } = await authService.updateUserMetadata({
          full_name: data.full_name
        });
        
        if (metadataError) {
          return handleError(metadataError);
        }
      }
      
      // Update profile in database
      const { data: profile, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('user_id', user.id)
        .select()
        .single();
        
      if (error) {
        const authError = new AuthServiceError(
          'Failed to update profile',
          AuthErrorType.UNKNOWN_ERROR,
          error
        );
        return handleError(authError);
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