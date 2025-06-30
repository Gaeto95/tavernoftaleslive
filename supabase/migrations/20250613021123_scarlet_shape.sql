/*
  # Character-Based Multiplayer System Restructure

  1. Changes Made
    - Restructure session_players to be character-centric
    - Simplify RLS policies to avoid infinite recursion
    - Add character selection flow for multiplayer
    - Fix session management and cleanup

  2. New Features
    - Character-based session joining
    - Simplified session visibility
    - Better session cleanup
    - Character switching in multiplayer

  3. Security
    - Simple, non-recursive RLS policies
    - Character ownership validation
    - Session access control
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can manage own session player records" ON session_players;
DROP POLICY IF EXISTS "DMs can manage players in their sessions" ON session_players;
DROP POLICY IF EXISTS "Players can view session participants" ON session_players;

-- Update session_players table structure for character-based approach
DO $$
BEGIN
  -- Ensure character_id is not nullable for players (DMs can have null)
  -- We'll enforce this in application logic rather than database constraints
  
  -- Add a unique constraint to prevent same character in multiple sessions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'session_players_character_session_unique'
    AND table_name = 'session_players'
  ) THEN
    ALTER TABLE session_players 
    ADD CONSTRAINT session_players_character_session_unique 
    UNIQUE (character_id, session_id);
  END IF;
END $$;

-- Create simple, non-recursive RLS policies

-- Policy 1: Users can see and manage their own session participation
CREATE POLICY "session_players_own_access"
  ON session_players
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 2: Users can view session players in public sessions
CREATE POLICY "session_players_public_view"
  ON session_players
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE is_public = true
    )
  );

-- Policy 3: DMs can view and manage all players in their sessions
CREATE POLICY "session_players_dm_access"
  ON session_players
  FOR ALL
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE dungeon_master_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE dungeon_master_id = auth.uid()
    )
  );

-- Update characters table to track active session
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'active_session_id'
  ) THEN
    ALTER TABLE characters ADD COLUMN active_session_id uuid REFERENCES game_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for active session lookup
CREATE INDEX IF NOT EXISTS idx_characters_active_session ON characters(active_session_id);

-- Function to join session with character
CREATE OR REPLACE FUNCTION join_session_with_character(
  session_uuid uuid,
  character_uuid uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record game_sessions;
  character_record characters;
  user_uuid uuid;
BEGIN
  -- Get current user
  user_uuid := auth.uid();
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify session exists and is joinable
  SELECT * INTO session_record FROM game_sessions WHERE id = session_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF session_record.current_players >= session_record.max_players THEN
    RAISE EXCEPTION 'Session is full';
  END IF;

  -- Verify character ownership
  SELECT * INTO character_record FROM characters 
  WHERE id = character_uuid AND user_id = user_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character not found or not owned by user';
  END IF;

  -- Check if character is already in a session
  IF character_record.active_session_id IS NOT NULL THEN
    RAISE EXCEPTION 'Character is already in another session';
  END IF;

  -- Remove any existing session participation for this user in this session
  DELETE FROM session_players 
  WHERE session_id = session_uuid AND user_id = user_uuid;

  -- Add player to session
  INSERT INTO session_players (
    session_id,
    user_id,
    character_id,
    role,
    is_ready
  ) VALUES (
    session_uuid,
    user_uuid,
    character_uuid,
    'player',
    false
  );

  -- Update character's active session
  UPDATE characters 
  SET active_session_id = session_uuid 
  WHERE id = character_uuid;

  -- Mark session as active
  UPDATE game_sessions 
  SET is_active = true, updated_at = now()
  WHERE id = session_uuid;

  RETURN true;
END;
$$;

-- Function to leave session
CREATE OR REPLACE FUNCTION leave_session(session_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid uuid;
  character_uuid uuid;
BEGIN
  user_uuid := auth.uid();
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get character ID from session participation
  SELECT character_id INTO character_uuid 
  FROM session_players 
  WHERE session_id = session_uuid AND user_id = user_uuid;

  -- Remove from session
  DELETE FROM session_players 
  WHERE session_id = session_uuid AND user_id = user_uuid;

  -- Clear character's active session
  IF character_uuid IS NOT NULL THEN
    UPDATE characters 
    SET active_session_id = NULL 
    WHERE id = character_uuid;
  END IF;

  RETURN true;
END;
$$;

-- Function to switch character in session
CREATE OR REPLACE FUNCTION switch_character_in_session(
  session_uuid uuid,
  new_character_uuid uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid uuid;
  old_character_uuid uuid;
BEGIN
  user_uuid := auth.uid();
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify new character ownership
  IF NOT EXISTS (
    SELECT 1 FROM characters 
    WHERE id = new_character_uuid AND user_id = user_uuid
  ) THEN
    RAISE EXCEPTION 'Character not found or not owned by user';
  END IF;

  -- Get old character ID
  SELECT character_id INTO old_character_uuid 
  FROM session_players 
  WHERE session_id = session_uuid AND user_id = user_uuid;

  -- Update session participation
  UPDATE session_players 
  SET character_id = new_character_uuid, is_ready = false
  WHERE session_id = session_uuid AND user_id = user_uuid;

  -- Clear old character's active session
  IF old_character_uuid IS NOT NULL THEN
    UPDATE characters 
    SET active_session_id = NULL 
    WHERE id = old_character_uuid;
  END IF;

  -- Set new character's active session
  UPDATE characters 
  SET active_session_id = session_uuid 
  WHERE id = new_character_uuid;

  RETURN true;
END;
$$;

-- Enhanced session cleanup that respects character relationships
CREATE OR REPLACE FUNCTION cleanup_character_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear active_session_id for characters in deleted sessions
  UPDATE characters 
  SET active_session_id = NULL 
  WHERE active_session_id NOT IN (SELECT id FROM game_sessions);

  -- Clear active_session_id for characters not actually in sessions
  UPDATE characters 
  SET active_session_id = NULL 
  WHERE active_session_id IS NOT NULL 
  AND id NOT IN (
    SELECT character_id FROM session_players 
    WHERE character_id IS NOT NULL
  );

  RAISE NOTICE 'Character session cleanup completed';
END;
$$;

-- Update the comprehensive cleanup to include character cleanup
CREATE OR REPLACE FUNCTION run_session_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clean up character relationships first
  PERFORM cleanup_character_sessions();
  
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
  
  RAISE NOTICE 'Comprehensive session cleanup completed';
END;
$$;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION join_session_with_character(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION leave_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION switch_character_in_session(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_character_sessions() TO authenticated;

-- Update session health view to include character info
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

-- Run initial cleanup
SELECT run_session_cleanup();

-- Force PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');

DO $$
BEGIN
  RAISE NOTICE 'Character-based multiplayer system restructure completed';
  RAISE NOTICE 'Sessions are now character-centric with simplified RLS policies';
  RAISE NOTICE 'Characters can be switched in sessions and track active sessions';
END $$;