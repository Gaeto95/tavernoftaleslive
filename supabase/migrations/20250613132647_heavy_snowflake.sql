/*
  # Fix Host System and Remove DM Role Inconsistencies

  1. Database Schema Updates
    - Ensure host_id is the primary authority for session management
    - Update constraints and policies to use host_id consistently
    - Remove DM role from session_players completely

  2. RLS Policy Fixes
    - Simplify policies to avoid recursion
    - Use host_id for session management permissions
    - Ensure proper access control for all tables

  3. Function Updates
    - Update all functions to use host-based system consistently
    - Fix session creation and joining logic
    - Ensure proper character handling
*/

-- First, ensure all sessions have a host_id
UPDATE game_sessions 
SET host_id = dungeon_master_id 
WHERE host_id IS NULL AND dungeon_master_id IS NOT NULL;

-- Remove any remaining DM roles from session_players
UPDATE session_players 
SET role = 'player' 
WHERE role = 'dm';

-- Update the role constraint to only allow player and observer
ALTER TABLE session_players DROP CONSTRAINT IF EXISTS session_players_role_check;
ALTER TABLE session_players ADD CONSTRAINT session_players_role_check 
CHECK (role IN ('player', 'observer'));

-- Drop all existing problematic RLS policies
DROP POLICY IF EXISTS "session_players_read_access" ON session_players;
DROP POLICY IF EXISTS "session_players_insert_own" ON session_players;
DROP POLICY IF EXISTS "session_players_update_own" ON session_players;
DROP POLICY IF EXISTS "session_players_delete_access" ON session_players;

-- Create simple, non-recursive RLS policies for session_players
CREATE POLICY "session_players_own_access"
  ON session_players
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "session_players_host_access"
  ON session_players
  FOR ALL
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE host_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE host_id = auth.uid()
    )
  );

CREATE POLICY "session_players_public_read"
  ON session_players
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE is_public = true
    )
  );

-- Update game_sessions policies to use host_id
DROP POLICY IF EXISTS "Anyone can view public sessions" ON game_sessions;
DROP POLICY IF EXISTS "Hosts can manage their sessions" ON game_sessions;

CREATE POLICY "Anyone can view public sessions"
  ON game_sessions
  FOR SELECT
  TO authenticated
  USING (is_public = true OR host_id = auth.uid());

CREATE POLICY "Hosts can manage their sessions"
  ON game_sessions
  FOR ALL
  TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- Fix story_entries policies
DROP POLICY IF EXISTS "story_entries_session_participants" ON story_entries;
DROP POLICY IF EXISTS "story_entries_participant_insert" ON story_entries;

CREATE POLICY "story_entries_session_access"
  ON story_entries
  FOR SELECT
  TO authenticated
  USING (
    -- Host can see all entries in their sessions
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE host_id = auth.uid()
    )
    OR
    -- Players can see entries in sessions they're part of
    session_id IN (
      SELECT session_id FROM session_players 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "story_entries_session_insert"
  ON story_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Host can add entries to their sessions
      session_id IN (
        SELECT id FROM game_sessions 
        WHERE host_id = auth.uid()
      )
      OR
      -- Players can add entries to sessions they're part of
      session_id IN (
        SELECT session_id FROM session_players 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Fix turn_actions policies
DROP POLICY IF EXISTS "turn_actions_session_participants" ON turn_actions;
DROP POLICY IF EXISTS "turn_actions_participant_management" ON turn_actions;

CREATE POLICY "turn_actions_session_access"
  ON turn_actions
  FOR SELECT
  TO authenticated
  USING (
    -- Host can see all actions in their sessions
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE host_id = auth.uid()
    )
    OR
    -- Players can see actions in sessions they're part of
    session_id IN (
      SELECT session_id FROM session_players 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "turn_actions_own_management"
  ON turn_actions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fix chat_messages policies
DROP POLICY IF EXISTS "chat_messages_session_participants" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_send_to_sessions" ON chat_messages;

CREATE POLICY "chat_messages_session_access"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    -- Host can see all chat in their sessions
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE host_id = auth.uid()
    )
    OR
    -- Players can see chat in sessions they're part of
    session_id IN (
      SELECT session_id FROM session_players 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_session_send"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Host can send messages to their sessions
      session_id IN (
        SELECT id FROM game_sessions 
        WHERE host_id = auth.uid()
      )
      OR
      -- Players can send messages to sessions they're part of
      session_id IN (
        SELECT session_id FROM session_players 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create a proper session creation function
CREATE OR REPLACE FUNCTION create_player_session(
  session_name text,
  session_description text DEFAULT '',
  max_players_count integer DEFAULT 6,
  is_public_session boolean DEFAULT true,
  password_hash_value text DEFAULT NULL,
  session_settings_value jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid uuid;
  session_uuid uuid;
  user_profile public.users;
BEGIN
  -- Get current user
  user_uuid := auth.uid();
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure user profile exists
  user_profile := ensure_user_profile_exists(user_uuid);

  -- Create the session with user as host
  INSERT INTO game_sessions (
    name,
    description,
    host_id,
    dungeon_master_id, -- Keep for compatibility but set same as host
    max_players,
    current_players,
    is_active,
    is_public,
    password_hash,
    session_settings,
    created_at,
    updated_at
  ) VALUES (
    session_name,
    session_description,
    user_uuid,
    user_uuid, -- Same as host for compatibility
    max_players_count,
    0,
    true,
    is_public_session,
    password_hash_value,
    session_settings_value,
    now(),
    now()
  ) RETURNING id INTO session_uuid;

  -- Add creator as first player (host)
  INSERT INTO session_players (
    session_id,
    user_id,
    character_id,
    role,
    is_ready,
    joined_at
  ) VALUES (
    session_uuid,
    user_uuid,
    NULL, -- Character will be set when joining with character
    'player',
    false, -- Host needs to be ready like everyone else
    now()
  );

  RETURN session_uuid;
END;
$$;

-- Create a proper join session function
CREATE OR REPLACE FUNCTION join_player_session(
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
  user_profile public.users;
  current_player_count integer;
BEGIN
  -- Get current user
  user_uuid := auth.uid();
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure user profile exists
  user_profile := ensure_user_profile_exists(user_uuid);

  -- Verify session exists
  SELECT * INTO session_record FROM game_sessions WHERE id = session_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Check session capacity
  SELECT COUNT(*) INTO current_player_count
  FROM session_players 
  WHERE session_id = session_uuid AND role = 'player';
  
  IF current_player_count >= session_record.max_players THEN
    RAISE EXCEPTION 'Session is full';
  END IF;

  -- Verify character ownership and availability
  SELECT * INTO character_record FROM characters 
  WHERE id = character_uuid AND user_id = user_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Character not found or not owned by user';
  END IF;

  -- Check if character is already in another session
  IF character_record.active_session_id IS NOT NULL AND character_record.active_session_id != session_uuid THEN
    RAISE EXCEPTION 'Character is already in another session';
  END IF;

  -- Remove any existing session participation for this user in this session
  DELETE FROM session_players 
  WHERE session_id = session_uuid AND user_id = user_uuid;

  -- Add user to session
  INSERT INTO session_players (
    session_id,
    user_id,
    character_id,
    role,
    is_ready,
    joined_at
  ) VALUES (
    session_uuid,
    user_uuid,
    character_uuid,
    'player',
    false,
    now()
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

-- Create leave session function
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

-- Function to start game (host only)
CREATE OR REPLACE FUNCTION start_player_game(session_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid uuid;
  ready_players integer;
  total_players integer;
BEGIN
  user_uuid := auth.uid();
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is host
  IF NOT EXISTS (
    SELECT 1 FROM game_sessions 
    WHERE id = session_uuid AND host_id = user_uuid
  ) THEN
    RAISE EXCEPTION 'Only the host can start the game';
  END IF;

  -- Check if all players are ready
  SELECT 
    COUNT(*) FILTER (WHERE is_ready = true),
    COUNT(*)
  INTO ready_players, total_players
  FROM session_players 
  WHERE session_id = session_uuid AND role = 'player';

  IF ready_players < total_players THEN
    RAISE EXCEPTION 'All players must be ready before starting';
  END IF;

  IF total_players < 2 THEN
    RAISE EXCEPTION 'Need at least 2 players to start';
  END IF;

  -- Start the game
  UPDATE game_sessions 
  SET 
    turn_phase = 'collecting',
    turn_deadline = now() + interval '5 minutes',
    updated_at = now()
  WHERE id = session_uuid;

  RETURN true;
END;
$$;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION create_player_session(text, text, integer, boolean, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION join_player_session(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION leave_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION start_player_game(uuid) TO authenticated;

-- Force PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the setup
DO $$
BEGIN
  RAISE NOTICE 'Host system has been fixed and DM role inconsistencies removed';
  RAISE NOTICE 'RLS policies have been simplified and made consistent';
  RAISE NOTICE 'Session creation and management functions updated';
  RAISE NOTICE 'All functions now use host_id consistently';
END $$;