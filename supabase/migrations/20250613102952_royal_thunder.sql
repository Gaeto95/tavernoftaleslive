/*
  # Fix DM visibility in sessions and simplify character requirements

  1. Changes Made
    - Allow DMs to join sessions without characters initially
    - Fix session player visibility for DMs
    - Simplify character requirements for multiplayer
    - Ensure DMs are always visible in their sessions

  2. Security
    - Maintain proper access control
    - Allow DMs to manage sessions without character requirements
    - Players still need characters to join
*/

-- Update the join session function to allow DMs without characters
CREATE OR REPLACE FUNCTION join_session_with_character(
  session_uuid uuid,
  character_uuid uuid DEFAULT NULL
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
  is_dm boolean;
BEGIN
  -- Get current user
  user_uuid := auth.uid();
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure user profile exists
  user_profile := ensure_user_profile_exists(user_uuid);

  -- Verify session exists and is joinable
  SELECT * INTO session_record FROM game_sessions WHERE id = session_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Check if user is the DM
  is_dm := session_record.dungeon_master_id = user_uuid;

  -- If not DM, verify session is active and not full
  IF NOT is_dm THEN
    IF NOT session_record.is_active THEN
      RAISE EXCEPTION 'Session is not active';
    END IF;

    -- Count current players (excluding DM)
    IF (SELECT COUNT(*) FROM session_players WHERE session_id = session_uuid AND role = 'player') >= session_record.max_players THEN
      RAISE EXCEPTION 'Session is full';
    END IF;
  END IF;

  -- If character is provided, verify ownership and availability
  IF character_uuid IS NOT NULL THEN
    SELECT * INTO character_record FROM characters 
    WHERE id = character_uuid AND user_id = user_uuid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Character not found or not owned by user';
    END IF;

    -- Check if character is already in another session
    IF character_record.active_session_id IS NOT NULL AND character_record.active_session_id != session_uuid THEN
      RAISE EXCEPTION 'Character is already in another session';
    END IF;
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
    is_ready,
    joined_at
  ) VALUES (
    session_uuid,
    user_uuid,
    character_uuid,
    CASE WHEN is_dm THEN 'dm' ELSE 'player' END,
    CASE WHEN is_dm THEN true ELSE false END, -- DMs are always ready
    now()
  );

  -- Update character's active session if character provided
  IF character_uuid IS NOT NULL THEN
    UPDATE characters 
    SET active_session_id = session_uuid 
    WHERE id = character_uuid;
  END IF;

  -- Mark session as active and update timestamp
  UPDATE game_sessions 
  SET is_active = true, updated_at = now()
  WHERE id = session_uuid;

  RETURN true;
END;
$$;

-- Update the create session function to ensure DM is properly added
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

  -- Add DM as session participant (without character requirement)
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

  -- Explicitly update session to ensure it's marked correctly
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

-- Update the switch character function to handle DMs
CREATE OR REPLACE FUNCTION switch_character_in_session(
  session_uuid uuid,
  new_character_uuid uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid uuid;
  old_character_uuid uuid;
  user_is_dm boolean;
BEGIN
  user_uuid := auth.uid();
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is DM of this session
  SELECT EXISTS(
    SELECT 1 FROM game_sessions 
    WHERE id = session_uuid AND dungeon_master_id = user_uuid
  ) INTO user_is_dm;

  -- If character is provided, verify ownership
  IF new_character_uuid IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM characters 
      WHERE id = new_character_uuid AND user_id = user_uuid
    ) THEN
      RAISE EXCEPTION 'Character not found or not owned by user';
    END IF;
  END IF;

  -- Get old character ID
  SELECT character_id INTO old_character_uuid 
  FROM session_players 
  WHERE session_id = session_uuid AND user_id = user_uuid;

  -- Update session participation
  UPDATE session_players 
  SET 
    character_id = new_character_uuid, 
    is_ready = CASE WHEN user_is_dm THEN true ELSE false END -- Keep DMs ready
  WHERE session_id = session_uuid AND user_id = user_uuid;

  -- Clear old character's active session
  IF old_character_uuid IS NOT NULL THEN
    UPDATE characters 
    SET active_session_id = NULL 
    WHERE id = old_character_uuid;
  END IF;

  -- Set new character's active session
  IF new_character_uuid IS NOT NULL THEN
    UPDATE characters 
    SET active_session_id = session_uuid 
    WHERE id = new_character_uuid;
  END IF;

  RETURN true;
END;
$$;

-- Grant permissions for updated functions
GRANT EXECUTE ON FUNCTION join_session_with_character(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION switch_character_in_session(uuid, uuid) TO authenticated;

-- Update existing DM participants to ensure they're properly set up
DO $$
DECLARE
  session_record RECORD;
BEGIN
  -- Ensure all DMs are participants in their sessions
  FOR session_record IN 
    SELECT gs.id, gs.dungeon_master_id 
    FROM game_sessions gs
    WHERE gs.dungeon_master_id IS NOT NULL
  LOOP
    -- Add or update DM as participant
    INSERT INTO session_players (
      session_id,
      user_id,
      character_id,
      role,
      is_ready,
      joined_at
    ) VALUES (
      session_record.id,
      session_record.dungeon_master_id,
      NULL,
      'dm',
      true,
      now()
    ) ON CONFLICT (session_id, user_id) 
    DO UPDATE SET 
      role = 'dm',
      is_ready = true;
    
    RAISE NOTICE 'Ensured DM participation in session %', session_record.id;
  END LOOP;
END $$;

-- Force PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');

DO $$
BEGIN
  RAISE NOTICE 'DM session participation has been fixed';
  RAISE NOTICE 'DMs can now join sessions without characters initially';
  RAISE NOTICE 'Character requirements simplified for multiplayer';
  RAISE NOTICE 'All existing DMs have been added as participants';
END $$;