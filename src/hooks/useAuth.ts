import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { auth, supabase } from '../lib/supabase';
import { User as AppUser } from '../types/multiplayer';

// Enhanced logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[AUTH INFO] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[AUTH ERROR] ${message}`, error || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[AUTH WARN] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    console.log(`[AUTH DEBUG] ${message}`, data || '');
  }
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        logger.info('Initializing auth...');
        const { data: { user }, error } = await auth.getCurrentUser();
        
        if (!mounted) return;
        
        if (error) {
          // Check if this is just a "no session" state, which is normal
          if (error.message === 'Auth session missing!') {
            logger.warn('No active session found - user is not logged in');
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
          
          // For other errors, log as error and set error state
          logger.error('Error getting current user', error);
          setError(error.message);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        logger.info('Initial user state', { userId: user?.id || 'No user' });
        setUser(user);
        
        if (user) {
          await loadUserProfile(user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      } catch (err) {
        if (!mounted) return;
        logger.error('Auth initialization error', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      logger.info('Auth state change', { event, userId: session?.user?.id || 'No user' });
      
      try {
        setError(null);
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          logger.info('User signed out, clearing all auth state');
          setUser(null);
          setProfile(null);
          setLoading(false);
          
          // Clean up any session data when user signs out
          await cleanupUserData();
          return;
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          logger.info('User signed in or token refreshed');
          setUser(session.user);
          if (session.user) {
            await loadUserProfile(session.user.id);
          }
        }
      } catch (err) {
        logger.error('Auth state change error', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const cleanupUserData = async () => {
    try {
      // Clear any cached data
      localStorage.removeItem('ai-dungeon-master-save');
      localStorage.removeItem('ai-dungeon-master-character');
      localStorage.removeItem('ai-dungeon-master-scene-image');
      logger.info('User data cleaned up');
      
      // Clean up any active sessions
      if (user?.id) {
        try {
          logger.info('Cleaning up user sessions', { userId: user.id });
          await supabase.rpc('cleanup_user_sessions', {
            user_uuid: user.id
          });
          logger.info('User sessions cleaned up');
        } catch (sessionError) {
          logger.warn('Error cleaning up sessions', sessionError);
        }
      }
    } catch (err) {
      logger.warn('Error cleaning up user data', err);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      logger.info('Loading user profile', { userId });
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        logger.error('Error loading user profile', error);
        // Don't throw error for missing profile, create one instead
        if (error.code === 'PGRST116') {
          logger.info('No profile found, this is normal for new users');
          setProfile(null);
        } else {
          throw error;
        }
      } else {
        logger.info('User profile loaded', { profileId: data?.id, username: data?.username });
        setProfile(data);
      }
    } catch (err) {
      logger.error('Error loading user profile', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (userId: string, username: string, displayName?: string) => {
    try {
      logger.info('Creating user profile', { userId, username });
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          username,
          display_name: displayName || username,
          last_seen: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating user profile', error);
        throw error;
      }

      logger.info('User profile created successfully', { profileId: data.id });
      setProfile(data);
      return data;
    } catch (err) {
      logger.error('Failed to create user profile', err);
      throw err;
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    setLoading(true);
    setError(null);
    
    try {
      logger.info('Signing up user', { email, username });
      
      // First check if username is already taken
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        throw new Error('Username is already taken');
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: username
          }
        }
      });
      
      if (error) throw error;
      
      if (data.user && !error) {
        logger.info('User created, creating profile...');
        // Create user profile immediately
        try {
          await createUserProfile(data.user.id, username, username);
          logger.info('User profile created successfully during signup');
        } catch (profileError) {
          logger.error('Error creating user profile during signup', profileError);
          // Don't fail the signup if profile creation fails, but log it
        }
      }
      
      return { data, error: null };
    } catch (err) {
      logger.error('Sign up error', err);
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      logger.info('Signing in user', { email });
      const { data, error } = await auth.signIn(email, password);
      if (error) throw error;
      
      // Check if user profile exists, create if not
      if (data.user) {
        const { data: existingProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (!existingProfile) {
          logger.info('No profile found for existing user, creating one');
          const username = data.user.email?.split('@')[0] || 'user';
          try {
            await createUserProfile(data.user.id, username);
          } catch (profileError) {
            logger.warn('Could not create profile for existing user', profileError);
          }
        }
        
        // Update last_seen timestamp
        try {
          await supabase
            .from('users')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', data.user.id);
        } catch (updateError) {
          logger.warn('Could not update last_seen timestamp', updateError);
        }
      }
      
      logger.info('Sign in successful', { userId: data?.user?.id });
      return { data, error: null };
    } catch (err) {
      logger.error('Sign in error', err);
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    
    try {
      logger.info('Signing in with Google');
      const { data, error } = await auth.signInWithGoogle();
      if (error) throw error;
      logger.info('Google sign in initiated', data);
      return { data, error: null };
    } catch (err) {
      logger.error('Google sign in error', err);
      const errorMessage = err instanceof Error ? err.message : 'Google sign in failed';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    logger.info('Starting sign out process...');
    setLoading(true);
    setError(null);
    
    try {
      // Clean up user data first
      await cleanupUserData();
      
      // Clean up any active sessions
      if (user?.id) {
        try {
          logger.info('Cleaning up user sessions', { userId: user.id });
          await supabase.rpc('cleanup_user_sessions', {
            user_uuid: user.id
          });
          logger.info('Cleaned up user sessions');
        } catch (sessionError) {
          logger.warn('Error cleaning up sessions', sessionError);
        }
      }
      
      // Clear auth state immediately for better UX
      logger.info('Clearing auth state immediately');
      setUser(null);
      setProfile(null);
      
      // Sign out from Supabase
      logger.info('Calling Supabase signOut...');
      const { error } = await auth.signOut();
      
      if (error) {
        logger.error('Supabase sign out error', error);
        throw error;
      }
      
      logger.info('Supabase sign out successful');
      
    } catch (err) {
      logger.error('Sign out error', err);
      setError(err instanceof Error ? err.message : 'Sign out failed');
      // Even if sign out fails, clear local state
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<AppUser>) => {
    if (!user) return;
    
    try {
      logger.info('Updating profile', { userId: user.id, updates });
      
      const { error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Reload profile
      await loadUserProfile(user.id);
      logger.info('Profile updated successfully');
    } catch (err) {
      logger.error('Error updating profile', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  return {
    user,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    createUserProfile,
    isAuthenticated: !!user
  };
}