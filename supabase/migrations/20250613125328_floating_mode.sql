/*
  # Simplify Multiplayer System - Player Sessions Only

  1. Changes Made
    - Remove DM role complexity
    - First player becomes host automatically
    - Simplify session creation and management
    - Host can start the game and manage basic settings

  2. New Structure
    - Sessions have a host_id instead of dungeon_master_id
    - All participants are players, first one is host
    - Host has additional privileges (start game, kick players)
    - Simplified game flow

  3. Security
    - Host-based access control
    - Players can join any public session
    - Host manages session lifecycle
*/

-- Add host_id column to game_sessions and remove dungeon_master_id dependency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'host_id'
  ) THEN
    ALTER TABLE game_sessions ADD COLUMN host_id uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update existing sessions to use host_id
UPDATE game_sessions 
SET host_id = dungeon_master_id 
WHERE host_id IS NULL AND dungeon_master_id IS NOT NULL;

-- Update session_players to remove DM role complexity
UPDATE session_players 
SET role = 'player' 
WHERE role = 'dm';

-- Update role constraint to only allow player and observer
ALTER TABLE session_players DROP CONSTRAINT IF EXISTS session_players_role_check;
ALTER TABLE session_players ADD CONSTRAINT session_players_role_check 
CHECK (role IN ('player', 'observer'));

-- Simplified session creation function
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
    dungeon_master_id, -- Keep for compatibility, set same as host
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

-- Simplified join session function
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

-- Function to check if user is host
CREATE OR REPLACE FUNCTION is_session_host(session_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM game_sessions 
    WHERE id = session_uuid AND host_id = user_uuid
  );
END;
$$;

-- Simplified game start function (host only)
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
  IF NOT is_session_host(session_uuid, user_uuid) THEN
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

-- Update RLS policies for simplified system
DROP POLICY IF EXISTS "Anyone can view public sessions" ON game_sessions;
CREATE POLICY "Anyone can view public sessions"
  ON game_sessions
  FOR SELECT
  TO authenticated
  USING (is_public = true OR host_id = auth.uid());

DROP POLICY IF EXISTS "DMs can manage their sessions" ON game_sessions;
CREATE POLICY "Hosts can manage their sessions"
  ON game_sessions
  FOR ALL
  TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- Update session cleanup to use host_id
CREATE OR REPLACE FUNCTION cleanup_session_on_host_leave()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  session_record game_sessions;
  remaining_players integer;
BEGIN
  -- Check if the leaving player was the host
  IF EXISTS (
    SELECT 1 FROM game_sessions 
    WHERE id = OLD.session_id AND host_id = OLD.user_id
  ) THEN
    -- Count remaining players
    SELECT COUNT(*) INTO remaining_players
    FROM session_players 
    WHERE session_id = OLD.session_id 
    AND role = 'player'
    AND user_id != OLD.user_id;
    
    -- If no players remain, mark session for cleanup
    IF remaining_players = 0 THEN
      UPDATE game_sessions 
      SET is_active = false, updated_at = now()
      WHERE id = OLD.session_id;
      
      INSERT INTO session_cleanup_queue (
        session_id,
        cleanup_after,
        reason
      ) VALUES (
        OLD.session_id,
        now() + interval '5 minutes',
        'Host left with no remaining players'
      ) ON CONFLICT (session_id) DO UPDATE SET
        cleanup_after = now() + interval '5 minutes',
        reason = 'Host left with no remaining players';
    ELSE
      -- Transfer host to oldest remaining player
      UPDATE game_sessions 
      SET 
        host_id = (
          SELECT user_id FROM session_players 
          WHERE session_id = OLD.session_id 
          AND role = 'player' 
          AND user_id != OLD.user_id
          ORDER BY joined_at ASC 
          LIMIT 1
        ),
        dungeon_master_id = (
          SELECT user_id FROM session_players 
          WHERE session_id = OLD.session_id 
          AND role = 'player' 
          AND user_id != OLD.user_id
          ORDER BY joined_at ASC 
          LIMIT 1
        ),
        updated_at = now()
      WHERE id = OLD.session_id;
      
      RAISE NOTICE 'Host transferred to oldest player in session %', OLD.session_id;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Update trigger
DROP TRIGGER IF EXISTS trigger_cleanup_on_dm_leave ON session_players;
DROP TRIGGER IF EXISTS trigger_cleanup_on_host_leave ON session_players;
CREATE TRIGGER trigger_cleanup_on_host_leave
  AFTER DELETE ON session_players
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_session_on_host_leave();

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_player_session(text, text, integer, boolean, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION join_player_session(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_session_host(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION start_player_game(uuid) TO authenticated;

-- Update existing sessions to have proper host setup
DO $$
DECLARE
  session_record RECORD;
BEGIN
  FOR session_record IN 
    SELECT gs.id, gs.host_id
    FROM game_sessions gs
    WHERE gs.host_id IS NOT NULL
  LOOP
    -- Ensure host is a participant
    INSERT INTO session_players (
      session_id,
      user_id,
      character_id,
      role,
      is_ready,
      joined_at
    ) VALUES (
      session_record.id,
      session_record.host_id,
      NULL,
      'player',
      false,
      now()
    ) ON CONFLICT (session_id, user_id) 
    DO UPDATE SET role = 'player';
  END LOOP;
END $$;

-- Force PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');

DO $$
BEGIN
  RAISE NOTICE 'Multiplayer system simplified to player-only sessions';
  RAISE NOTICE 'First player becomes host automatically';
  RAISE NOTICE 'Host can start games and manage basic settings';
  RAISE NOTICE 'No more DM role complexity';
END $$;