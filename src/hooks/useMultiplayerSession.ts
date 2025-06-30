import { useState, useEffect, useCallback } from 'react';
import { supabase, subscriptions } from '../lib/supabase';
import { GameSession, SessionPlayer, TurnAction, MultiplayerStoryEntry, TurnState } from '../types/multiplayer';
import { OpenAIService } from '../services/openai';

// Enhanced logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[MULTIPLAYER INFO] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[MULTIPLAYER ERROR] ${message}`, error || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[MULTIPLAYER WARN] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    console.log(`[MULTIPLAYER DEBUG] ${message}`, data || '');
  }
};

export function useMultiplayerSession(sessionId: string | null, userId: string | null) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [turnActions, setTurnActions] = useState<TurnAction[]>([]);
  const [storyEntries, setStoryEntries] = useState<MultiplayerStoryEntry[]>([]);
  const [turnState, setTurnState] = useState<TurnState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingTurn, setProcessingTurn] = useState(false);
  
  // New state for connection management
  const [isConnected, setIsConnected] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState<{[key: string]: any}>({});
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);

  // Load session data with enhanced error handling
  const loadSession = useCallback(async () => {
    if (!sessionId || !userId) {
      logger.debug('No session ID or user ID provided, skipping load');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      logger.info('Loading session data', { sessionId, userId });
      
      // Load session with host info
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select(`
          *,
          host:users!host_id(*)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        logger.error('Failed to load session', sessionError);
        throw sessionError;
      }
      
      logger.info('Session loaded successfully', { sessionName: sessionData.name, hostId: sessionData.host_id });
      setSession(sessionData);

      // Load players
      logger.debug('Loading session players');
      
      const { data: playersData, error: playersError } = await supabase
        .from('session_players')
        .select(`
          *,
          user:users(*),
          character:characters(*)
        `)
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });

      if (playersError) {
        logger.error('Failed to load players', playersError);
        setPlayers([]);
      } else {
        logger.info('Players loaded', { playerCount: playersData?.length || 0 });
        setPlayers(playersData || []);
      }

      // Load story entries
      logger.debug('Loading story entries');
      const { data: storyData, error: storyError } = await supabase
        .from('story_entries')
        .select(`
          *,
          user:users(*)
        `)
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (storyError) {
        logger.error('Failed to load story entries', storyError);
        setStoryEntries([]);
      } else {
        logger.info('Story entries loaded', { entryCount: storyData?.length || 0 });
        setStoryEntries(storyData || []);
      }

      // Load current turn actions
      logger.debug('Loading turn actions', { turnNumber: sessionData.current_turn });
      const { data: actionsData, error: actionsError } = await supabase
        .from('turn_actions')
        .select(`
          *,
          user:users(*)
        `)
        .eq('session_id', sessionId)
        .eq('turn_number', sessionData.current_turn);

      if (actionsError) {
        logger.error('Failed to load turn actions', actionsError);
        setTurnActions([]);
      } else {
        logger.info('Turn actions loaded', { actionCount: actionsData?.length || 0 });
        setTurnActions(actionsData || []);
      }

      // Calculate turn state
      const totalPlayers = playersData?.filter(p => p.role === 'player').length || 0;
      const playersReady = playersData?.filter(p => p.is_ready && p.role === 'player').length || 0;
      const actionsSubmitted = actionsData?.length || 0;

      const calculatedTurnState = {
        session_id: sessionId,
        current_turn: sessionData.current_turn,
        turn_phase: sessionData.turn_phase,
        turn_deadline: sessionData.turn_deadline ? new Date(sessionData.turn_deadline) : undefined,
        actions_submitted: actionsSubmitted,
        players_ready: playersReady,
        total_players: totalPlayers
      };
      
      logger.debug('Turn state calculated', calculatedTurnState);
      setTurnState(calculatedTurnState);
      
      // Update last load time for reconnection logic
      setLastLoadTime(Date.now());
      
      // Reset reconnection attempts on successful load
      if (reconnectAttempts > 0) {
        setReconnectAttempts(0);
        logger.info('Connection restored, reset reconnection attempts');
      }
      
      // Mark as connected
      setIsConnected(true);

    } catch (err) {
      logger.error('Error loading session', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
      
      // If this was a network error during a reconnection attempt, increment the counter
      if (reconnectAttempts > 0) {
        setReconnectAttempts(prev => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, userId, reconnectAttempts]);

  // Setup connection monitoring
  useEffect(() => {
    // Function to check if we're online
    const handleOnlineStatus = () => {
      const isOnline = navigator.onLine;
      logger.debug('Connection status changed', { isOnline });
      setIsConnected(isOnline);
      
      if (isOnline && !isConnected) {
        // We just came back online after being offline
        logger.info('Reconnected to network, attempting to reload session data');
        setReconnectAttempts(1); // Start reconnection process
      }
    };
    
    // Listen for online/offline events
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    // Initial check
    handleOnlineStatus();
    
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [isConnected]);

  // Reconnection logic
  useEffect(() => {
    if (reconnectAttempts > 0 && isConnected && sessionId) {
      logger.info(`Reconnection attempt ${reconnectAttempts}/5`);
      
      // Exponential backoff for reconnection attempts
      const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 10000);
      
      const reconnectTimer = setTimeout(() => {
        // Attempt to reload session data
        loadSession().catch(err => {
          logger.error('Reconnection attempt failed', err);
          
          if (reconnectAttempts < 5) {
            // Schedule another attempt
            setReconnectAttempts(prev => prev + 1);
          } else {
            // Give up after 5 attempts
            logger.error('Maximum reconnection attempts reached');
            setError('Failed to reconnect after multiple attempts. Please refresh the page.');
            setReconnectAttempts(0);
          }
        });
        
        // Also attempt to reestablish subscriptions
        setupSubscriptions();
      }, backoffTime);
      
      return () => clearTimeout(reconnectTimer);
    }
  }, [reconnectAttempts, isConnected, sessionId, loadSession]);

  // Function to set up all subscriptions
  const setupSubscriptions = useCallback(() => {
    if (!sessionId) return {};
    
    logger.info('Setting up granular real-time subscriptions', { sessionId });
    
    // Clean up any existing subscriptions first
    Object.values(activeSubscriptions).forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    
    // Create new subscriptions
    const newSubscriptions: {[key: string]: any} = {
      session: subscriptions.sessionUpdates(sessionId, (payload) => {
        logger.debug('Session update received', payload);
        if (payload.eventType === 'UPDATE') {
          setSession(prev => prev ? { ...prev, ...payload.new } : null);
          
          // Reload session data to get fresh player count
          loadSession();
        }
      }),

      players: subscriptions.sessionPlayers(sessionId, (payload) => {
        logger.debug('Session players update received', payload);
        // Reload the entire session to get fresh data
        setTimeout(() => loadSession(), 200);
      }),

      actions: subscriptions.turnActions(sessionId, (payload) => {
        logger.debug('Turn actions update received', payload);
        if (payload.eventType === 'INSERT') {
          setTurnActions(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setTurnActions(prev => prev.map(action => 
            action.id === payload.new.id ? { ...action, ...payload.new } : action
          ));
        }
      }),

      story: subscriptions.storyEntries(sessionId, (payload) => {
        logger.debug('Story entries update received', payload);
        if (payload.eventType === 'INSERT') {
          setStoryEntries(prev => [...prev, payload.new]);
        }
      })
    };
    
    // Store the new subscriptions
    setActiveSubscriptions(newSubscriptions);
    
    return newSubscriptions;
  }, [sessionId, loadSession]);

  // Subscribe to real-time updates with reconnection support
  useEffect(() => {
    if (!sessionId) return;
    
    // Set up subscriptions
    const subs = setupSubscriptions();
    
    // Cleanup function
    return () => {
      logger.info('Cleaning up real-time subscriptions');
      Object.values(subs).forEach(sub => {
        if (sub && typeof sub.unsubscribe === 'function') {
          sub.unsubscribe();
        }
      });
    };
  }, [sessionId, setupSubscriptions]);

  // Load initial data
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Create session using the fixed function
  const createSession = async (sessionData: {
    name: string;
    description?: string;
    maxPlayers?: number;
    isPublic?: boolean;
    password?: string;
    sessionSettings?: any;
  }) => {
    if (!userId) {
      logger.warn('Cannot create session: missing userId');
      throw new Error('User not authenticated');
    }

    try {
      logger.info('Creating new player session', { sessionData, userId });
      
      const { data, error } = await supabase.rpc('create_player_session', {
        session_name: sessionData.name,
        session_description: sessionData.description || '',
        max_players_count: sessionData.maxPlayers || 6,
        is_public_session: sessionData.isPublic !== false,
        password_hash_value: sessionData.password ? btoa(sessionData.password) : null,
        session_settings_value: sessionData.sessionSettings || {}
      });

      if (error) {
        logger.error('Failed to create session', error);
        throw error;
      }
      
      logger.info('Session created successfully', { sessionId: data });
      
      // Wait a moment for the database to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      return data;
    } catch (err) {
      logger.error('Error creating session', err);
      throw err;
    }
  };

  // Join session with character using the fixed function
  const joinSession = async (characterId: string) => {
    if (!sessionId || !userId) {
      logger.warn('Cannot join session: missing sessionId or userId');
      return;
    }

    try {
      logger.info('Joining session', { sessionId, userId, characterId });
      
      const { data, error } = await supabase.rpc('join_player_session', {
        session_uuid: sessionId,
        character_uuid: characterId
      });

      if (error) throw error;
      
      logger.info('Successfully joined session');
      
      // Wait a moment for the database to update
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadSession();
    } catch (err) {
      logger.error('Error joining session', err);
      setError(err instanceof Error ? err.message : 'Failed to join session');
    }
  };

  // Leave session using the fixed function
  const leaveSession = async () => {
    if (!sessionId || !userId) {
      logger.warn('Cannot leave session: missing sessionId or userId');
      return;
    }

    try {
      logger.info('Leaving session', { sessionId, userId });
      
      const { data, error } = await supabase.rpc('leave_session', {
        session_uuid: sessionId
      });

      if (error) throw error;
      
      logger.info('Successfully left session');
    } catch (err) {
      logger.error('Error leaving session', err);
      setError(err instanceof Error ? err.message : 'Failed to leave session');
    }
  };

  // Switch character in session
  const switchCharacter = async (newCharacterId?: string) => {
    if (!sessionId || !userId) {
      logger.warn('Cannot switch character: missing sessionId or userId');
      return;
    }

    try {
      logger.info('Switching character in session', { sessionId, userId, newCharacterId });
      
      const { data, error } = await supabase.rpc('switch_character_in_session', {
        session_uuid: sessionId,
        new_character_uuid: newCharacterId || null
      });

      if (error) throw error;
      
      logger.info('Successfully switched character');
      
      // Wait a moment for the database to update
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadSession();
    } catch (err) {
      logger.error('Error switching character', err);
      setError(err instanceof Error ? err.message : 'Failed to switch character');
    }
  };

  // Submit turn action
  const submitAction = async (actionText: string, characterId?: string) => {
    if (!sessionId || !userId || !session) {
      logger.warn('Cannot submit action: missing required data');
      return;
    }

    try {
      logger.info('Submitting turn action', { sessionId, userId, actionText, characterId });
      
      const { error } = await supabase
        .from('turn_actions')
        .upsert({
          session_id: sessionId,
          user_id: userId,
          character_id: characterId,
          turn_number: session.current_turn,
          action_text: actionText
        });

      if (error) throw error;
      
      logger.info('Turn action submitted successfully');
    } catch (err) {
      logger.error('Error submitting action', err);
      setError(err instanceof Error ? err.message : 'Failed to submit action');
    }
  };

  // Set ready status
  const setReady = async (ready: boolean) => {
    if (!sessionId || !userId) {
      logger.warn('Cannot set ready status: missing sessionId or userId');
      return;
    }

    try {
      logger.info('Setting ready status', { sessionId, userId, ready });
      
      const { error } = await supabase
        .from('session_players')
        .update({ 
          is_ready: ready,
          last_action_time: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
      
      logger.info('Ready status updated successfully');
      
      // Wait a moment for the database to update
      await new Promise(resolve => setTimeout(resolve, 200));
      await loadSession();
    } catch (err) {
      logger.error('Error setting ready status', err);
      setError(err instanceof Error ? err.message : 'Failed to update ready status');
    }
  };

  // Start game (host only)
  const startGame = async () => {
    if (!sessionId || !session || !userId) {
      logger.warn('Cannot start game: missing required data');
      return;
    }

    try {
      logger.info('Starting game', { sessionId, userId });
      
      const { data, error } = await supabase.rpc('start_player_game', {
        session_uuid: sessionId
      });

      if (error) throw error;
      
      logger.info('Game started successfully');
      await loadSession();
    } catch (err) {
      logger.error('Error starting game', err);
      setError(err instanceof Error ? err.message : 'Failed to start game');
    }
  };

  // Process turn (host only)
  const processTurn = async () => {
    if (!sessionId || !session || !userId) {
      logger.warn('Cannot process turn: missing required data');
      return;
    }
    
    // Check if user is host
    if (session.host_id !== userId) {
      logger.error('Only the host can process turns');
      setError('Only the host can process turns');
      return;
    }

    try {
      logger.info('Processing turn', { sessionId, currentTurn: session.current_turn });
      setProcessingTurn(true);
      
      // Update session to processing phase
      await supabase
        .from('game_sessions')
        .update({ turn_phase: 'processing' })
        .eq('id', sessionId);

      // Get all actions for current turn
      const { data: actions } = await supabase
        .from('turn_actions')
        .select(`
          *,
          user:users(*),
          character:characters(*)
        `)
        .eq('session_id', sessionId)
        .eq('turn_number', session.current_turn)
        .eq('is_processed', false);

      if (actions && actions.length > 0) {
        logger.info('Processing turn actions', { actionCount: actions.length });
        
        // Combine all actions into a narrative prompt
        let narrativePrompt = "As the storyteller, create a cohesive narrative that incorporates all player actions. Each character should have a moment to shine. Here are the player actions:\n\n";
        
        actions.forEach(action => {
          const characterName = action.character?.name || "Unknown Character";
          const playerName = action.user?.username || "Unknown Player";
          narrativePrompt += `${characterName} (played by ${playerName}): ${action.action_text}\n`;
        });
        
        narrativePrompt += "\nCreate an engaging narrative that weaves these actions together, describes the environment, and advances the story. Include dialogue, descriptions, and consequences of the actions. End with a situation that prompts the next set of actions.";

        // Generate AI response
        const openaiService = new OpenAIService(import.meta.env.VITE_OPENAI_API_KEY || '');
        const aiResponse = await openaiService.generateStory(
          narrativePrompt,
          storyEntries.slice(-4).map(entry => ({
            type: entry.type,
            content: entry.content
          })),
          [], // No inventory needed for multiplayer narrative
          1, // Level doesn't matter for narrative
          0  // XP doesn't matter for narrative
        );

        logger.info('AI response generated for turn');

        // Add story entry
        await supabase
          .from('story_entries')
          .insert({
            session_id: sessionId,
            user_id: userId,
            type: 'dm',
            content: aiResponse,
            turn_number: session.current_turn
          });

        // Mark actions as processed
        await supabase
          .from('turn_actions')
          .update({ 
            is_processed: true,
            processed_at: new Date().toISOString()
          })
          .eq('session_id', sessionId)
          .eq('turn_number', session.current_turn);
      }

      // Advance to next turn
      await supabase.rpc('advance_turn', { session_uuid: sessionId });
      
      logger.info('Turn processed successfully');
      
      // Reset all players' ready status for the next turn
      await supabase
        .from('session_players')
        .update({ is_ready: false })
        .eq('session_id', sessionId);

      // Reload session data
      await loadSession();
    } catch (err) {
      logger.error('Error processing turn', err);
      setError(err instanceof Error ? err.message : 'Failed to process turn');
    } finally {
      setProcessingTurn(false);
    }
  };

  // Start turn collection (host only)
  const startTurnCollection = async (timeLimit: number = 5) => {
    if (!sessionId || !session || !userId) {
      logger.warn('Cannot start turn collection: missing required data');
      return;
    }
    
    if (session.host_id !== userId) {
      logger.error('Only the host can start turn collection');
      setError('Only the host can start turn collection');
      return;
    }

    try {
      logger.info('Starting turn collection', { sessionId, timeLimit });
      
      await supabase.rpc('start_turn_collection', { 
        session_uuid: sessionId,
        deadline_minutes: timeLimit
      });
      
      logger.info('Turn collection started successfully');
      await loadSession();
    } catch (err) {
      logger.error('Error starting turn collection', err);
      setError(err instanceof Error ? err.message : 'Failed to start turn collection');
    }
  };

  // Clean up user sessions
  const cleanupUserSessions = async () => {
    if (!userId) {
      logger.warn('Cannot cleanup sessions: no userId');
      return;
    }

    try {
      logger.info('Cleaning up user sessions', { userId });
      
      // First, ensure we're not in any active sessions
      if (sessionId) {
        try {
          await leaveSession();
        } catch (leaveError) {
          logger.warn('Error leaving current session during cleanup', leaveError);
        }
      }
      
      // Then, find any other sessions this user might be in
      const { data: playerSessions } = await supabase
        .from('session_players')
        .select('session_id')
        .eq('user_id', userId);
      
      if (playerSessions && playerSessions.length > 0) {
        logger.info('Found additional sessions to clean up', { count: playerSessions.length });
        
        // Leave each session
        for (const ps of playerSessions) {
          try {
            await supabase.rpc('leave_session', { session_uuid: ps.session_id });
          } catch (error) {
            logger.warn(`Failed to leave session ${ps.session_id}`, error);
          }
        }
      }
        
      logger.info('User sessions cleaned up successfully');
      
      // Run general session cleanup
      try {
        await supabase.rpc('run_session_cleanup');
      } catch (error) {
        logger.warn('Error running general session cleanup', error);
      }
      
    } catch (err) {
      logger.warn('Error cleaning up user sessions', err);
    }
  };

  // Force refresh session data
  const refreshSession = useCallback(() => {
    if (sessionId && userId) {
      // Only reload if it's been more than 2 seconds since the last load
      // This prevents too many rapid reloads
      const now = Date.now();
      if (now - lastLoadTime > 2000) {
        loadSession();
      }
    }
  }, [sessionId, userId, loadSession, lastLoadTime]);

  const currentPlayer = players.find(p => p.user_id === userId);
  const isHost = session?.host_id === userId;
  const hasSubmittedAction = turnActions.some(action => action.user_id === userId);

  logger.debug('Session state summary', {
    sessionId,
    userId,
    hasSession: !!session,
    playerCount: players.length,
    isHost,
    hasSubmittedAction,
    currentTurn: session?.current_turn,
    turnPhase: session?.turn_phase,
    currentPlayer: currentPlayer?.user?.username,
    isConnected,
    reconnectAttempts,
    playersInSession: players.map(p => ({ 
      username: p.user?.username, 
      role: p.role,
      isCurrentUser: p.user_id === userId
    }))
  });

  return {
    session,
    players,
    turnActions,
    storyEntries,
    turnState,
    currentPlayer,
    isHost,
    hasSubmittedAction,
    loading,
    error,
    isConnected,
    reconnectAttempts,
    createSession,
    joinSession,
    leaveSession,
    switchCharacter,
    submitAction,
    setReady,
    startGame,
    processTurn,
    startTurnCollection,
    cleanupUserSessions,
    refreshSession
  };
}