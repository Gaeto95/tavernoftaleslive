import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Enhanced logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[SESSION CLEANUP INFO] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[SESSION CLEANUP ERROR] ${message}`, error || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[SESSION CLEANUP WARN] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    console.log(`[SESSION CLEANUP DEBUG] ${message}`, data || '');
  }
};

export function useSessionCleanup() {
  // Process cleanup queue periodically
  const processCleanupQueue = useCallback(async () => {
    try {
      logger.debug('Processing session cleanup queue');
      
      const { data, error } = await supabase.rpc('process_session_cleanup_queue');
      
      if (error) {
        logger.error('Failed to process cleanup queue', error);
        return;
      }
      
      if (data && data > 0) {
        logger.info('Cleaned up sessions', { count: data });
      }
    } catch (err) {
      logger.error('Error processing cleanup queue', err);
    }
  }, []);

  // Run all cleanup operations
  const runAllCleanup = useCallback(async () => {
    try {
      logger.debug('Running all cleanup operations');
      
      const { data, error } = await supabase.rpc('run_session_cleanup');
      
      if (error) {
        logger.error('Failed to run cleanup operations', error);
        return;
      }
      
      logger.info('Cleanup operations completed successfully');
    } catch (err) {
      logger.error('Error running cleanup operations', err);
    }
  }, []);

  // Clean up orphaned sessions
  const cleanupOrphanedSessions = useCallback(async () => {
    try {
      logger.debug('Cleaning up orphaned sessions');
      
      const { data, error } = await supabase.rpc('cleanup_orphaned_sessions');
      
      if (error) {
        logger.error('Failed to clean up orphaned sessions', error);
        return;
      }
      
      if (data && data > 0) {
        logger.info('Cleaned up orphaned sessions', { count: data });
      }
    } catch (err) {
      logger.error('Error cleaning up orphaned sessions', err);
    }
  }, []);

  // Clean up user sessions
  const cleanupUserSessions = useCallback(async (userId: string) => {
    try {
      logger.debug('Cleaning up user sessions', { userId });
      
      const { data, error } = await supabase.rpc('cleanup_user_sessions', {
        user_uuid: userId
      });
      
      if (error) {
        logger.error('Failed to clean up user sessions', error);
        return;
      }
      
      if (data && data > 0) {
        logger.info('Cleaned up user sessions', { count: data, userId });
      }
    } catch (err) {
      logger.error('Error cleaning up user sessions', err);
    }
  }, []);

  // Create a checkpoint for the current game state
  const createCheckpoint = useCallback(async (
    sessionId: string, 
    checkpointName: string, 
    checkpointData: any = {}
  ) => {
    try {
      logger.info('Creating game checkpoint', { sessionId, checkpointName });
      
      const { data, error } = await supabase.rpc('create_game_checkpoint', {
        session_uuid: sessionId,
        checkpoint_name: checkpointName,
        checkpoint_data: checkpointData
      });
      
      if (error) {
        logger.error('Failed to create checkpoint', error);
        throw error;
      }
      
      logger.info('Checkpoint created successfully', { checkpointId: data });
      return data;
    } catch (err) {
      logger.error('Error creating checkpoint', err);
      throw err;
    }
  }, []);

  // Check if a game can start
  const checkGameStartConditions = useCallback(async (sessionId: string) => {
    try {
      logger.debug('Checking game start conditions', { sessionId });
      
      const { data, error } = await supabase.rpc('can_start_game', {
        session_uuid: sessionId
      });
      
      if (error) {
        logger.error('Failed to check game start conditions', error);
        throw error;
      }
      
      const result = data && data.length > 0 ? data[0] : null;
      logger.debug('Game start check result', result);
      
      return result;
    } catch (err) {
      logger.error('Error checking game start conditions', err);
      throw err;
    }
  }, []);

  // Set up periodic cleanup processing
  useEffect(() => {
    // Process cleanup queue every 5 minutes
    const interval = setInterval(() => {
      processCleanupQueue();
    }, 5 * 60 * 1000);

    // Initial cleanup
    processCleanupQueue();

    // Run full cleanup once per hour
    const fullCleanupInterval = setInterval(() => {
      runAllCleanup();
    }, 60 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearInterval(fullCleanupInterval);
    };
  }, [processCleanupQueue, runAllCleanup]);

  return {
    processCleanupQueue,
    runAllCleanup,
    cleanupOrphanedSessions,
    cleanupUserSessions,
    createCheckpoint,
    checkGameStartConditions
  };
}