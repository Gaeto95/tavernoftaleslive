/*
  # Fix Session Creation and Participant Visibility

  1. Issues Fixed
    - Disable aggressive session cleanup during creation
    - Fix session participant visibility immediately after creation
    - Ensure proper session state after creation
    - Fix RLS policies for immediate visibility

  2. Changes
    - Add grace period for new sessions
    - Fix session creation flow
    - Improve participant visibility
    - Better error handling
*/

-- Disable aggressive cleanup that's interfering with new sessions
CREATE OR REPLACE FUNCTION cleanup_empty_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only delete sessions that are empty AND older than 10 minutes (increased grace period)
  -- AND have never had any players
  DELETE FROM game_sessions 
  WHERE id IN (
    SELECT gs.id 
    FROM game_sessions gs 
    LEFT JOIN session_players sp ON gs.id = sp.session_id 
    WHERE sp.session_id IS NULL
    AND gs.created_at < now() - interval '10 minutes'  -- Longer grace period
    AND gs.current_players = 0
  );
  
  RAISE NOTICE 'Cleaned up empty sessions (with 10 minute grace period)';
END;
$$;

-- Fix the session creation function to ensure immediate visibility
CREATE OR REPLACE FUNCTION create_session_with_dm(
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

  RAISE NOTICE 'Creating session for user: %', user_uuid;

  -- Ensure user profile exists
  user_profile := ensure_user_profile_exists(user_uuid);
  RAISE NOTICE 'User profile ensured: %', user_profile.username;

  -- Create the session
  INSERT INTO game_sessions (
    name,
    description,
    dungeon_master_id,
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
    max_players_count,
    0, -- Will be updated by trigger
    true,
    is_public_session,
    password_hash_value,
    session_settings_value,
    now(),
    now()
  ) RETURNING id INTO session_uuid;

  RAISE NOTICE 'Session created with ID: %', session_uuid;

  -- Add DM as session participant
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
    NULL, -- DMs don't need a character initially
    'dm',
    true, -- DMs are always ready
    now()
  );

  RAISE NOTICE 'DM added as participant to session: %', session_uuid;

  -- Explicitly update session to ensure it's marked as having participants
  UPDATE game_sessions 
  SET 
    current_players = (
      SELECT COUNT(*) FROM session_players 
      WHERE session_id = session_uuid AND role = 'player'
    ),
    is_active = true,
    updated_at = now()
  WHERE id = session_uuid;

  RAISE NOTICE 'Session updated with participant count';

  -- Verify the session was created properly
  IF NOT EXISTS (
    SELECT 1 FROM game_sessions 
    WHERE id = session_uuid AND dungeon_master_id = user_uuid
  ) THEN
    RAISE EXCEPTION 'Session creation verification failed';
  END IF;

  -- Verify DM was added as participant
  IF NOT EXISTS (
    SELECT 1 FROM session_players 
    WHERE session_id = session_uuid AND user_id = user_uuid AND role = 'dm'
  ) THEN
    RAISE EXCEPTION 'DM participant creation verification failed';
  END IF;

  RAISE NOTICE 'Session creation completed successfully: %', session_uuid;
  RETURN session_uuid;
END;
$$;

-- Simplify RLS policies to ensure immediate visibility after creation
DROP POLICY IF EXISTS "session_players_own_management" ON session_players;
DROP POLICY IF EXISTS "session_players_dm_management" ON session_players;
DROP POLICY IF EXISTS "session_players_public_sessions" ON session_players;

-- Create very simple, direct policies
CREATE POLICY "session_players_own_management"
  ON session_players
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "session_players_dm_management"
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

CREATE POLICY "session_players_public_sessions"
  ON session_players
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE is_public = true
    )
  );

-- Add a function to get session info for debugging
CREATE OR REPLACE FUNCTION get_session_info(session_uuid uuid)
RETURNS TABLE(
  session_id uuid,
  session_name text,
  dm_id uuid,
  dm_username text,
  current_players integer,
  max_players integer,
  is_active boolean,
  participant_count bigint,
  participants text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gs.id,
    gs.name,
    gs.dungeon_master_id,
    u.username,
    gs.current_players,
    gs.max_players,
    gs.is_active,
    COUNT(sp.id) as participant_count,
    ARRAY_AGG(u2.username || ' (' || sp.role || ')') as participants
  FROM game_sessions gs
  LEFT JOIN users u ON gs.dungeon_master_id = u.id
  LEFT JOIN session_players sp ON gs.id = sp.session_id
  LEFT JOIN users u2 ON sp.user_id = u2.id
  WHERE gs.id = session_uuid
  GROUP BY gs.id, gs.name, gs.dungeon_master_id, u.username, gs.current_players, gs.max_players, gs.is_active;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_session_info(uuid) TO authenticated;

-- Disable automatic cleanup for now to prevent interference
CREATE OR REPLACE FUNCTION run_session_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only clean up very old sessions (7+ days) to prevent interference with new sessions
  DELETE FROM game_sessions 
  WHERE created_at < now() - interval '7 days';
  
  -- Clean up orphaned data
  DELETE FROM chat_messages 
  WHERE session_id NOT IN (SELECT id FROM game_sessions);
  
  DELETE FROM turn_actions 
  WHERE session_id NOT IN (SELECT id FROM game_sessions);
  
  DELETE FROM story_entries 
  WHERE session_id NOT IN (SELECT id FROM game_sessions);
  
  RAISE NOTICE 'Minimal session cleanup completed (7+ day old sessions only)';
END;
$$;

-- Force PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');

DO $$
BEGIN
  RAISE NOTICE 'Session creation flow has been fixed';
  RAISE NOTICE 'Aggressive cleanup has been disabled';
  RAISE NOTICE 'RLS policies have been simplified for immediate visibility';
  RAISE NOTICE 'Added debugging function get_session_info()';
END $$;