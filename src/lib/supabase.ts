import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Enhanced logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[SUPABASE INFO] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[SUPABASE ERROR] ${message}`, error || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[SUPABASE WARN] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    console.log(`[SUPABASE DEBUG] ${message}`, data || '');
  }
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'ai-dungeon-master'
    }
  }
});

// Enhanced error logging for Supabase operations
const logSupabaseOperation = (operation: string, table: string, result: any) => {
  if (result.error) {
    logger.error(`${operation} failed on ${table}`, {
      error: result.error,
      code: result.error.code,
      message: result.error.message,
      details: result.error.details,
      hint: result.error.hint
    });
  } else {
    logger.debug(`${operation} successful on ${table}`, {
      dataCount: Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0
    });
  }
  return result;
};

// Wrap Supabase client with enhanced logging
const createLoggedClient = (client: typeof supabase) => {
  return new Proxy(client, {
    get(target, prop) {
      if (prop === 'from') {
        return (table: string) => {
          const tableClient = target.from(table);
          return new Proxy(tableClient, {
            get(tableTarget, tableProp) {
              const originalMethod = tableTarget[tableProp as keyof typeof tableTarget];
              if (typeof originalMethod === 'function') {
                return async (...args: any[]) => {
                  const result = await originalMethod.apply(tableTarget, args);
                  logSupabaseOperation(String(tableProp), table, result);
                  return result;
                };
              }
              return originalMethod;
            }
          });
        };
      }
      return target[prop as keyof typeof target];
    }
  });
};

// Use logged client for debugging
export const loggedSupabase = createLoggedClient(supabase);

// Auth helpers with improved error handling and logging
export const auth = {
  signUp: async (email: string, password: string, username: string) => {
    logger.info('Auth.signUp called', { email, username });
    
    try {
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
      
      if (error) {
        logger.error('Sign up error', error);
        return { data, error };
      }
      
      if (data.user && !error) {
        logger.info('User created, creating profile...');
        // Create user profile
        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          username,
          display_name: username
        });
        
        if (profileError) {
          logger.error('Error creating user profile', profileError);
          // Don't fail the signup if profile creation fails
        } else {
          logger.info('User profile created successfully');
        }
      }
      
      return { data, error };
    } catch (err) {
      logger.error('Unexpected sign up error', err);
      return { 
        data: null, 
        error: { message: err instanceof Error ? err.message : 'Unexpected error during sign up' }
      };
    }
  },

  signIn: async (email: string, password: string) => {
    logger.info('Auth.signIn called', { email });
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) {
        logger.error('Sign in error', result.error);
      } else {
        logger.info('Sign in successful');
      }
      return result;
    } catch (err) {
      logger.error('Unexpected sign in error', err);
      return { 
        data: { user: null, session: null }, 
        error: { message: err instanceof Error ? err.message : 'Unexpected error during sign in' }
      };
    }
  },

  signInWithGoogle: async () => {
    logger.info('Auth.signInWithGoogle called');
    try {
      // Get the current URL to determine the correct redirect
      const currentUrl = window.location.origin;
      logger.info('Using redirect URL', { currentUrl });
      
      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: currentUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (result.error) {
        logger.error('Google sign in error', result.error);
      } else {
        logger.info('Google sign in initiated');
      }
      
      return result;
    } catch (err) {
      logger.error('Unexpected Google sign in error', err);
      return { 
        data: { url: null, provider: 'google' }, 
        error: { message: err instanceof Error ? err.message : 'Unexpected error during Google sign in' }
      };
    }
  },

  signOut: async () => {
    logger.info('Auth.signOut called');
    try {
      // Force sign out with scope 'local' to ensure immediate effect
      const result = await supabase.auth.signOut({ scope: 'local' });
      if (result.error) {
        logger.error('Sign out error', result.error);
      } else {
        logger.info('Sign out successful');
      }
      return result;
    } catch (err) {
      logger.error('Unexpected sign out error', err);
      return { 
        error: { message: err instanceof Error ? err.message : 'Unexpected error during sign out' }
      };
    }
  },

  getCurrentUser: () => {
    try {
      return supabase.auth.getUser();
    } catch (err) {
      logger.error('Error getting current user', err);
      return Promise.resolve({ 
        data: { user: null }, 
        error: { message: err instanceof Error ? err.message : 'Error getting current user' }
      });
    }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    try {
      return supabase.auth.onAuthStateChange((event, session) => {
        logger.debug('Auth state change', { event, userId: session?.user?.id });
        callback(event, session);
      });
    } catch (err) {
      logger.error('Error setting up auth state change listener', err);
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  }
};

// Real-time subscriptions with error handling and logging
export const subscriptions = {
  sessionUpdates: (sessionId: string, callback: (payload: any) => void) => {
    try {
      logger.info('Setting up session updates subscription', { sessionId });
      return supabase
        .channel(`session-${sessionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`
        }, (payload) => {
          try {
            logger.debug('Session update received', { sessionId, event: payload.eventType });
            callback(payload);
          } catch (err) {
            logger.error('Error in session update callback', err);
          }
        })
        .subscribe((status) => {
          logger.debug('Session subscription status', { sessionId, status });
        });
    } catch (err) {
      logger.error('Error setting up session updates subscription', err);
      return { unsubscribe: () => {} };
    }
  },

  sessionPlayers: (sessionId: string, callback: (payload: any) => void) => {
    try {
      logger.info('Setting up session players subscription', { sessionId });
      return supabase
        .channel(`session-players-${sessionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'session_players',
          filter: `session_id=eq.${sessionId}`
        }, (payload) => {
          try {
            logger.debug('Session players update received', { sessionId, event: payload.eventType });
            callback(payload);
          } catch (err) {
            logger.error('Error in session players callback', err);
          }
        })
        .subscribe((status) => {
          logger.debug('Session players subscription status', { sessionId, status });
        });
    } catch (err) {
      logger.error('Error setting up session players subscription', err);
      return { unsubscribe: () => {} };
    }
  },

  turnActions: (sessionId: string, callback: (payload: any) => void) => {
    try {
      logger.info('Setting up turn actions subscription', { sessionId });
      return supabase
        .channel(`turn-actions-${sessionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'turn_actions',
          filter: `session_id=eq.${sessionId}`
        }, (payload) => {
          try {
            logger.debug('Turn actions update received', { sessionId, event: payload.eventType });
            callback(payload);
          } catch (err) {
            logger.error('Error in turn actions callback', err);
          }
        })
        .subscribe((status) => {
          logger.debug('Turn actions subscription status', { sessionId, status });
        });
    } catch (err) {
      logger.error('Error setting up turn actions subscription', err);
      return { unsubscribe: () => {} };
    }
  },

  storyEntries: (sessionId: string, callback: (payload: any) => void) => {
    try {
      logger.info('Setting up story entries subscription', { sessionId });
      return supabase
        .channel(`story-${sessionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'story_entries',
          filter: `session_id=eq.${sessionId}`
        }, (payload) => {
          try {
            logger.debug('Story entries update received', { sessionId, event: payload.eventType });
            callback(payload);
          } catch (err) {
            logger.error('Error in story entries callback', err);
          }
        })
        .subscribe((status) => {
          logger.debug('Story entries subscription status', { sessionId, status });
        });
    } catch (err) {
      logger.error('Error setting up story entries subscription', err);
      return { unsubscribe: () => {} };
    }
  }
};