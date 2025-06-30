/*
  # Fix aggressive session cleanup that deletes new sessions

  1. Problem
    - Sessions are being deleted immediately after creation
    - Cleanup system is too aggressive
    - No grace period for new sessions

  2. Solution
    - Add grace periods for new sessions (5-30 minutes)
    - Make cleanup much less aggressive
    - Remove automatic cleanup on player leave
    - Increase time thresholds significantly

  3. Changes
    - Update cleanup functions to be conservative
    - Add grace periods and longer thresholds
    - Create separate manual cleanup function
    - Update session health view
*/

-- Fix the cleanup functions to be less aggressive
CREATE OR REPLACE FUNCTION cleanup_empty_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only delete sessions that are empty AND older than 5 minutes
  -- This gives new sessions time to get players
  DELETE FROM game_sessions 
  WHERE id IN (
    SELECT gs.id 
    FROM game_sessions gs 
    LEFT JOIN session_players sp ON gs.id = sp.session_id 
    WHERE sp.session_id IS NULL
    AND gs.created_at < now() - interval '5 minutes'  -- Grace period for new sessions
  );
  
  RAISE NOTICE 'Cleaned up empty sessions (with 5 minute grace period)';
END;
$$;

-- Fix inactive session cleanup to be much less aggressive
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only delete sessions inactive for more than 48 hours (increased from 24)
  DELETE FROM game_sessions 
  WHERE updated_at < now() - interval '48 hours'
    AND is_active = false
    AND current_players = 0;  -- Only if no players
  
  -- Mark active sessions as inactive if no activity for 12+ hours (increased from 6)
  UPDATE game_sessions 
  SET is_active = false, updated_at = now()
  WHERE updated_at < now() - interval '12 hours'
    AND is_active = true;
    
  RAISE NOTICE 'Cleaned up inactive sessions (48h+ with no players)';
END;
$$;

-- Fix old session cleanup to be less aggressive
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only delete sessions older than 14 days (increased from 7) AND with no players
  DELETE FROM game_sessions 
  WHERE created_at < now() - interval '14 days'
    AND current_players = 0;
  
  RAISE NOTICE 'Cleaned up old sessions (14+ days with no players)';
END;
$$;

-- Update the session player count trigger to NOT run cleanup on every change
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
    
    -- REMOVED: Don't run cleanup on every player leave
    -- This was causing immediate deletion of new sessions
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Update comprehensive cleanup to be much more conservative
CREATE OR REPLACE FUNCTION run_session_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run cleanup for truly abandoned sessions
  
  -- Clean up sessions that are empty for more than 30 minutes
  DELETE FROM game_sessions 
  WHERE current_players = 0 
    AND updated_at < now() - interval '30 minutes'
    AND created_at < now() - interval '30 minutes';
  
  -- Clean up very old sessions (30+ days)
  DELETE FROM game_sessions 
  WHERE created_at < now() - interval '30 days';
  
  -- Clean up orphaned data
  DELETE FROM chat_messages 
  WHERE session_id NOT IN (SELECT id FROM game_sessions);
  
  DELETE FROM turn_actions 
  WHERE session_id NOT IN (SELECT id FROM game_sessions);
  
  DELETE FROM story_entries 
  WHERE session_id NOT IN (SELECT id FROM game_sessions);
  
  RAISE NOTICE 'Conservative session cleanup completed';
END;
$$;

-- Create a separate function for manual cleanup (more aggressive)
CREATE OR REPLACE FUNCTION run_aggressive_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function can be called manually for more aggressive cleanup
  PERFORM cleanup_empty_sessions();
  PERFORM cleanup_inactive_sessions();
  PERFORM cleanup_old_sessions();
  
  RAISE NOTICE 'Aggressive cleanup completed (manual only)';
END;
$$;

-- Update the view to show better session health info
DROP VIEW IF EXISTS session_health;
CREATE VIEW session_health AS
SELECT 
  gs.id,
  gs.name,
  gs.current_players,
  gs.max_players,
  gs.is_active,
  gs.created_at,
  gs.updated_at,
  EXTRACT(EPOCH FROM (now() - gs.updated_at))/3600 as hours_since_activity,
  EXTRACT(EPOCH FROM (now() - gs.created_at))/60 as minutes_since_creation,
  CASE 
    WHEN gs.current_players = 0 AND gs.created_at < now() - interval '30 minutes' THEN 'empty_old'
    WHEN gs.current_players = 0 AND gs.created_at >= now() - interval '30 minutes' THEN 'empty_new'
    WHEN gs.updated_at < now() - interval '48 hours' THEN 'stale'
    WHEN gs.updated_at < now() - interval '12 hours' THEN 'inactive'
    ELSE 'active'
  END as health_status
FROM game_sessions gs;

-- Grant permissions
GRANT EXECUTE ON FUNCTION run_aggressive_cleanup() TO authenticated;

-- Wrap the notice in a DO block to avoid syntax error
DO $$
BEGIN
  RAISE NOTICE 'Session cleanup has been made much less aggressive. New sessions have grace periods.';
END $$;