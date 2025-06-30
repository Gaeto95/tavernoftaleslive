/*
  # Session Cleanup System

  1. New Functions
    - `cleanup_empty_sessions()` - Remove sessions with no players
    - `cleanup_inactive_sessions()` - Remove sessions inactive for 24+ hours
    - `cleanup_old_sessions()` - Remove sessions older than 7 days

  2. Automatic Cleanup
    - Trigger on session_players DELETE to check if session becomes empty
    - Scheduled cleanup for inactive sessions

  3. Session Activity Tracking
    - Update session.updated_at when players join/leave
    - Track last activity for cleanup decisions
*/

-- Function to cleanup empty sessions (no players)
CREATE OR REPLACE FUNCTION cleanup_empty_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete sessions that have no players
  DELETE FROM game_sessions 
  WHERE id IN (
    SELECT gs.id 
    FROM game_sessions gs 
    LEFT JOIN session_players sp ON gs.id = sp.session_id 
    WHERE sp.session_id IS NULL
  );
  
  RAISE NOTICE 'Cleaned up empty sessions';
END;
$$;

-- Function to cleanup inactive sessions (24+ hours with no activity)
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete sessions inactive for more than 24 hours
  DELETE FROM game_sessions 
  WHERE updated_at < now() - interval '24 hours'
    AND is_active = false;
  
  -- Mark active sessions as inactive if no activity for 6+ hours
  UPDATE game_sessions 
  SET is_active = false, updated_at = now()
  WHERE updated_at < now() - interval '6 hours'
    AND is_active = true;
    
  RAISE NOTICE 'Cleaned up inactive sessions';
END;
$$;

-- Function to cleanup very old sessions (7+ days)
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete sessions older than 7 days
  DELETE FROM game_sessions 
  WHERE created_at < now() - interval '7 days';
  
  RAISE NOTICE 'Cleaned up old sessions';
END;
$$;

-- Enhanced session player count trigger that also handles cleanup
CREATE OR REPLACE FUNCTION update_session_player_count_and_cleanup()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update player count and mark session as active
    UPDATE game_sessions 
    SET 
      current_players = current_players + 1,
      is_active = true,
      updated_at = now()
    WHERE id = NEW.session_id;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Update player count
    UPDATE game_sessions 
    SET 
      current_players = current_players - 1,
      updated_at = now()
    WHERE id = OLD.session_id;
    
    -- Check if session is now empty and clean it up
    PERFORM cleanup_empty_sessions();
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Replace the existing trigger
DROP TRIGGER IF EXISTS trigger_update_session_player_count ON session_players;
CREATE TRIGGER trigger_update_session_player_count_and_cleanup
  AFTER INSERT OR DELETE ON session_players
  FOR EACH ROW
  EXECUTE FUNCTION update_session_player_count_and_cleanup();

-- Function to run comprehensive cleanup (can be called manually or scheduled)
CREATE OR REPLACE FUNCTION run_session_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Run all cleanup functions
  PERFORM cleanup_empty_sessions();
  PERFORM cleanup_inactive_sessions();
  PERFORM cleanup_old_sessions();
  
  -- Clean up orphaned chat messages
  DELETE FROM chat_messages 
  WHERE session_id NOT IN (SELECT id FROM game_sessions);
  
  -- Clean up orphaned turn actions
  DELETE FROM turn_actions 
  WHERE session_id NOT IN (SELECT id FROM game_sessions);
  
  -- Clean up orphaned story entries
  DELETE FROM story_entries 
  WHERE session_id NOT IN (SELECT id FROM game_sessions);
  
  RAISE NOTICE 'Comprehensive session cleanup completed';
END;
$$;

-- Add a function to mark session as active when there's activity
CREATE OR REPLACE FUNCTION mark_session_active(session_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE game_sessions 
  SET 
    is_active = true,
    updated_at = now()
  WHERE id = session_uuid;
END;
$$;

-- Update existing functions to mark sessions as active
CREATE OR REPLACE FUNCTION advance_turn(session_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE game_sessions 
  SET 
    current_turn = current_turn + 1,
    turn_phase = 'waiting',
    turn_deadline = NULL,
    is_active = true,
    updated_at = now()
  WHERE id = session_uuid;
  
  -- Reset player ready states
  UPDATE session_players 
  SET is_ready = false 
  WHERE session_id = session_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION start_turn_collection(session_uuid uuid, deadline_minutes integer DEFAULT 5)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE game_sessions 
  SET 
    turn_phase = 'collecting',
    turn_deadline = now() + (deadline_minutes || ' minutes')::interval,
    is_active = true,
    updated_at = now()
  WHERE id = session_uuid;
END;
$$;

-- Create a view for session health monitoring
CREATE OR REPLACE VIEW session_health AS
SELECT 
  gs.id,
  gs.name,
  gs.current_players,
  gs.max_players,
  gs.is_active,
  gs.created_at,
  gs.updated_at,
  EXTRACT(EPOCH FROM (now() - gs.updated_at))/3600 as hours_since_activity,
  CASE 
    WHEN gs.current_players = 0 THEN 'empty'
    WHEN gs.updated_at < now() - interval '24 hours' THEN 'stale'
    WHEN gs.updated_at < now() - interval '6 hours' THEN 'inactive'
    ELSE 'active'
  END as health_status
FROM game_sessions gs;

-- Grant permissions for the cleanup functions
GRANT EXECUTE ON FUNCTION cleanup_empty_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_inactive_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION run_session_cleanup() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_session_active(uuid) TO authenticated;

-- Initial cleanup run
SELECT run_session_cleanup();