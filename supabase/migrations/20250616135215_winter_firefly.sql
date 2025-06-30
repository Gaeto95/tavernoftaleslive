/*
  # Session Cleanup Functions

  1. New Functions
    - `cleanup_old_chat_messages`: Removes chat messages older than a specified threshold
    - `cleanup_orphaned_sessions`: Identifies and cleans up sessions with no players
    - `cleanup_user_sessions`: Removes a user from all their active sessions
    - `has_active_players`: Checks if a session has any active players
    - `run_session_cleanup`: Runs all cleanup operations in sequence

  2. Security
    - Added RLS policy for the cleanup queue
    - All functions use SECURITY DEFINER to ensure proper permissions
*/

-- Function to clean up old chat messages
CREATE OR REPLACE FUNCTION cleanup_old_chat_messages(days_to_keep int DEFAULT 7)
RETURNS int AS $$
DECLARE
  deleted_count int;
BEGIN
  -- Delete chat messages older than the specified threshold
  DELETE FROM chat_messages
  WHERE timestamp < (now() - (days_to_keep || ' days')::interval);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up orphaned sessions
CREATE OR REPLACE FUNCTION cleanup_orphaned_sessions()
RETURNS int AS $$
DECLARE
  cleaned_count int := 0;
  orphaned_session record;
BEGIN
  -- Find sessions with no players that are still marked as active
  FOR orphaned_session IN 
    SELECT gs.id 
    FROM game_sessions gs
    LEFT JOIN session_players sp ON gs.id = sp.session_id
    WHERE gs.is_active = true
    GROUP BY gs.id
    HAVING COUNT(sp.id) = 0
  LOOP
    -- Mark session as inactive
    UPDATE game_sessions
    SET is_active = false
    WHERE id = orphaned_session.id;
    
    cleaned_count := cleaned_count + 1;
  END LOOP;
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up sessions for a specific user
CREATE OR REPLACE FUNCTION cleanup_user_sessions(user_uuid uuid)
RETURNS int AS $$
DECLARE
  cleaned_count int := 0;
  user_session record;
BEGIN
  -- Find all sessions where this user is a player
  FOR user_session IN 
    SELECT session_id 
    FROM session_players
    WHERE user_id = user_uuid
  LOOP
    -- Remove the user from the session
    DELETE FROM session_players
    WHERE session_id = user_session.session_id
    AND user_id = user_uuid;
    
    cleaned_count := cleaned_count + 1;
  END LOOP;
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a session has any active players
CREATE OR REPLACE FUNCTION has_active_players(session_uuid uuid)
RETURNS boolean AS $$
DECLARE
  player_count int;
BEGIN
  SELECT COUNT(*) INTO player_count
  FROM session_players
  WHERE session_id = session_uuid;
  
  RETURN player_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to run all cleanup operations
CREATE OR REPLACE FUNCTION run_session_cleanup()
RETURNS void AS $$
BEGIN
  -- Clean up old chat messages
  PERFORM cleanup_old_chat_messages();
  
  -- Clean up orphaned sessions
  PERFORM cleanup_orphaned_sessions();
  
  -- Process the cleanup queue
  PERFORM process_session_cleanup_queue();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for the cleanup queue
ALTER TABLE IF EXISTS session_cleanup_queue ENABLE ROW LEVEL SECURITY;

-- Create policy for cleanup queue (without using IF NOT EXISTS)
DO $$
BEGIN
  -- Check if policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'session_cleanup_queue' 
    AND policyname = 'cleanup_queue_service_access'
  ) THEN
    -- Create the policy if it doesn't exist
    CREATE POLICY "cleanup_queue_service_access"
      ON session_cleanup_queue
      FOR ALL
      TO service_role
      USING (true);
  END IF;
END
$$;