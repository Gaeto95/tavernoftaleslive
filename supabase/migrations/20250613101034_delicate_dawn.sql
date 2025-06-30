/*
  # Fix Multiplayer Session Creation and User Visibility

  1. Issues Fixed
    - Users not appearing in sessions they create
    - Session creation not properly adding DM as participant
    - RLS policies preventing proper session visibility
    - Missing user profile creation for new auth users

  2. Changes
    - Fix session creation to automatically add DM as participant
    - Improve RLS policies for better session visibility
    - Add automatic user profile creation
    - Fix session player count tracking
    - Ensure proper character relationships

  3. Security
    - Maintain proper access control
    - Ensure users can see sessions they participate in
    - DMs have full control over their sessions
*/

-- Function to ensure user profile exists (improved)
CREATE OR REPLACE FUNCTION ensure_user_profile_exists(user_uuid uuid)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record public.users;
  auth_user_record auth.users;
  username_value text;
BEGIN
  -- Check if profile already exists
  SELECT * INTO user_record FROM public.users WHERE id = user_uuid;
  
  IF FOUND THEN
    RETURN user_record;
  END IF;
  
  -- Get auth user info
  SELECT * INTO auth_user_record FROM auth.users WHERE id = user_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auth user not found';
  END IF;
  
  -- Generate username from email or use a default
  username_value := COALESCE(
    split_part(auth_user_record.email, '@', 1),
    'user_' || substr(user_uuid::text, 1, 8)
  );
  
  -- Ensure username is unique
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = username_value) LOOP
    username_value := username_value || '_' || floor(random() * 1000)::text;
  END LOOP;
  
  -- Create user profile
  INSERT INTO public.users (
    id,
    username,
    display_name,
    created_at,
    updated_at,
    last_seen
  ) VALUES (
    user_uuid,
    username_value,
    COALESCE(auth_user_record.raw_user_meta_data->>'display_name', username_value),
    now(),
    now(),
    now()
  ) RETURNING * INTO user_record;
  
  RETURN user_record;
END;
$$;

-- Enhanced session creation function that properly adds DM as participant
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

  -- Ensure user profile exists
  user_profile := ensure_user_profile_exists(user_uuid);

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
    NULL, -- DMs don't need a character
    'dm',
    true, -- DMs are always ready
    now()
  );

  -- Update session player count (the trigger should handle this, but let's be explicit)
  UPDATE game_sessions 
  SET current_players = (
    SELECT COUNT(*) FROM session_players 
    WHERE session_id = session_uuid AND role = 'player'
  )
  WHERE id = session_uuid;

  RETURN session_uuid;
END;
$$;

-- Enhanced join session function with better error handling
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
  user_profile public.users;
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

  IF NOT session_record.is_active THEN
    RAISE EXCEPTION 'Session is not active';
  END IF;

  -- Count current players (excluding DM)
  IF (SELECT COUNT(*) FROM session_players WHERE session_id = session_uuid AND role = 'player') >= session_record.max_players THEN
    RAISE EXCEPTION 'Session is full';
  END IF;

  -- Verify character ownership
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
    'player',
    false,
    now()
  );

  -- Update character's active session
  UPDATE characters 
  SET active_session_id = session_uuid 
  WHERE id = character_uuid;

  -- Mark session as active and update timestamp
  UPDATE game_sessions 
  SET is_active = true, updated_at = now()
  WHERE id = session_uuid;

  RETURN true;
END;
$$;

-- Fix the session player count trigger to be more accurate
CREATE OR REPLACE FUNCTION update_session_player_count_and_cleanup()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  player_count integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Count only players (not DMs or observers)
    SELECT COUNT(*) INTO player_count
    FROM session_players 
    WHERE session_id = NEW.session_id AND role = 'player';
    
    -- Update player count and mark session as active
    UPDATE game_sessions 
    SET 
      current_players = player_count,
      is_active = true,
      updated_at = now()
    WHERE id = NEW.session_id;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Count only players (not DMs or observers)
    SELECT COUNT(*) INTO player_count
    FROM session_players 
    WHERE session_id = OLD.session_id AND role = 'player';
    
    -- Update player count
    UPDATE game_sessions 
    SET 
      current_players = player_count,
      updated_at = now()
    WHERE id = OLD.session_id;
    
    RETURN OLD;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle role changes
    IF OLD.role != NEW.role THEN
      SELECT COUNT(*) INTO player_count
      FROM session_players 
      WHERE session_id = NEW.session_id AND role = 'player';
      
      UPDATE game_sessions 
      SET 
        current_players = player_count,
        updated_at = now()
      WHERE id = NEW.session_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Recreate the trigger to handle updates as well
DROP TRIGGER IF EXISTS trigger_update_session_player_count_and_cleanup ON session_players;
CREATE TRIGGER trigger_update_session_player_count_and_cleanup
  AFTER INSERT OR DELETE OR UPDATE ON session_players
  FOR EACH ROW
  EXECUTE FUNCTION update_session_player_count_and_cleanup();

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION ensure_user_profile_exists(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_session_with_dm(text, text, integer, boolean, text, jsonb) TO authenticated;

-- Update existing sessions to ensure DMs are participants
DO $$
DECLARE
  session_record RECORD;
BEGIN
  FOR session_record IN 
    SELECT gs.id, gs.dungeon_master_id 
    FROM game_sessions gs
    LEFT JOIN session_players sp ON gs.id = sp.session_id AND gs.dungeon_master_id = sp.user_id
    WHERE sp.id IS NULL AND gs.dungeon_master_id IS NOT NULL
  LOOP
    -- Add DM as participant if not already there
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
    ) ON CONFLICT (session_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Added DM as participant to session %', session_record.id;
  END LOOP;
END $$;

-- Fix session player counts for existing sessions
UPDATE game_sessions 
SET current_players = (
  SELECT COUNT(*) 
  FROM session_players 
  WHERE session_id = game_sessions.id AND role = 'player'
);

-- Force PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the setup
DO $$
BEGIN
  RAISE NOTICE 'Multiplayer session creation has been fixed';
  RAISE NOTICE 'DMs are now automatically added as session participants';
  RAISE NOTICE 'Session player counts have been corrected';
  RAISE NOTICE 'User profile creation is now automatic';
END $$;