/*
  # Session Cleanup Improvements

  1. New Functions
    - `cleanup_inactive_sessions`: Automatically marks sessions as inactive when all players have left
    - `cleanup_stale_sessions`: Removes players from sessions that haven't been active for a long time
    - `auto_cleanup_trigger`: Trigger to run cleanup on player actions
  
  2. Modifications
    - Add last_activity field to game_sessions
    - Add session cleanup queue table
    - Add automatic cleanup trigger
*/

-- Add last_activity timestamp to game_sessions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'game_sessions' AND column_name = 'last_activity'
  ) THEN
    ALTER TABLE game_sessions ADD COLUMN last_activity timestamptz DEFAULT now();
  END IF;
END $$;

-- Create session_cleanup_queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS session_cleanup_queue (
  session_id uuid PRIMARY KEY REFERENCES game_sessions(id) ON DELETE CASCADE,
  cleanup_after timestamptz NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add index for cleanup_after to efficiently find sessions ready for cleanup
CREATE INDEX IF NOT EXISTS idx_session_cleanup_queue_cleanup_after ON session_cleanup_queue (cleanup_after);

-- Function to mark sessions as inactive when all players have left
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
DECLARE
  inactive_session record;
BEGIN
  -- Find sessions with no players
  FOR inactive_session IN 
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
    WHERE id = inactive_session.id;
    
    -- Log this action
    RAISE NOTICE 'Session % marked as inactive due to no players', inactive_session.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up stale sessions
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void AS $$
DECLARE
  stale_session record;
  stale_threshold interval := interval '24 hours';
BEGIN
  -- Find sessions that haven't had activity in 24 hours
  FOR stale_session IN 
    SELECT id 
    FROM game_sessions
    WHERE is_active = true
    AND last_activity < (now() - stale_threshold)
  LOOP
    -- Queue session for cleanup
    INSERT INTO session_cleanup_queue (session_id, cleanup_after, reason)
    VALUES (stale_session.id, now() + interval '1 hour', 'Stale session')
    ON CONFLICT (session_id) DO NOTHING;
    
    -- Log this action
    RAISE NOTICE 'Session % queued for cleanup due to inactivity', stale_session.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process the cleanup queue
CREATE OR REPLACE FUNCTION process_session_cleanup_queue()
RETURNS int AS $$
DECLARE
  cleanup_count int := 0;
  session_to_clean record;
BEGIN
  -- Find sessions ready for cleanup
  FOR session_to_clean IN 
    SELECT session_id 
    FROM session_cleanup_queue
    WHERE cleanup_after <= now()
  LOOP
    -- Remove all players from the session
    DELETE FROM session_players
    WHERE session_id = session_to_clean.session_id;
    
    -- Mark session as inactive
    UPDATE game_sessions
    SET is_active = false
    WHERE id = session_to_clean.session_id;
    
    -- Remove from queue
    DELETE FROM session_cleanup_queue
    WHERE session_id = session_to_clean.session_id;
    
    cleanup_count := cleanup_count + 1;
  END LOOP;
  
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update session last_activity timestamp
CREATE OR REPLACE FUNCTION update_session_last_activity()
RETURNS trigger AS $$
BEGIN
  UPDATE game_sessions
  SET last_activity = now()
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last_activity when players interact with a session
CREATE TRIGGER trigger_update_session_activity
AFTER INSERT OR UPDATE ON session_players
FOR EACH ROW
EXECUTE FUNCTION update_session_last_activity();

-- Trigger to update last_activity when actions are submitted
CREATE TRIGGER trigger_update_session_activity_on_action
AFTER INSERT ON turn_actions
FOR EACH ROW
EXECUTE FUNCTION update_session_last_activity();

-- Trigger to update last_activity when story entries are added
CREATE TRIGGER trigger_update_session_activity_on_story
AFTER INSERT ON story_entries
FOR EACH ROW
EXECUTE FUNCTION update_session_last_activity();

-- Function to automatically run cleanup operations
CREATE OR REPLACE FUNCTION auto_cleanup_trigger()
RETURNS trigger AS $$
BEGIN
  -- Run with a 5% chance to avoid excessive processing
  IF random() < 0.05 THEN
    PERFORM cleanup_inactive_sessions();
    PERFORM cleanup_stale_sessions();
    PERFORM process_session_cleanup_queue();
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to occasionally run cleanup on player actions
CREATE TRIGGER trigger_auto_cleanup
AFTER INSERT OR UPDATE OR DELETE ON session_players
FOR EACH STATEMENT
EXECUTE FUNCTION auto_cleanup_trigger();

-- Create a scheduled function to run cleanup regularly
-- Note: This would ideally be set up as a cron job or scheduled task
-- For Supabase, you would use a scheduled Edge Function