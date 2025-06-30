-- Enhanced session creation and DM participation fix
-- This migration ensures DMs are ALWAYS visible as participants

-- Function to force DM participation in session
CREATE OR REPLACE FUNCTION ensure_dm_participation(session_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record game_sessions;
  dm_participation_exists boolean;
BEGIN
  -- Get session info
  SELECT * INTO session_record FROM game_sessions WHERE id = session_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Check if DM is already a participant
  SELECT EXISTS(
    SELECT 1 FROM session_players 
    WHERE session_id = session_uuid 
    AND user_id = session_record.dungeon_master_id
  ) INTO dm_participation_exists;

  -- If DM is not a participant, add them
  IF NOT dm_participation_exists THEN
    INSERT INTO session_players (
      session_id,
      user_id,
      character_id,
      role,
      is_ready,
      joined_at
    ) VALUES (
      session_uuid,
      session_record.dungeon_master_id,
      NULL,
      'dm',
      true,
      now()
    );
    
    RAISE NOTICE 'Added DM as participant to session %', session_uuid;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Enhanced session creation function with guaranteed DM participation
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
  dm_added boolean;
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
    0,
    true,
    is_public_session,
    password_hash_value,
    session_settings_value,
    now(),
    now()
  ) RETURNING id INTO session_uuid;

  RAISE NOTICE 'Session created with ID: %', session_uuid;

  -- CRITICAL: Add DM as session participant with multiple verification steps
  BEGIN
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
      NULL,
      'dm',
      true,
      now()
    );
    
    RAISE NOTICE 'DM added as participant to session: %', session_uuid;
    dm_added := true;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to add DM as participant: %', SQLERRM;
    dm_added := false;
  END;

  -- If DM wasn't added, try the ensure function
  IF NOT dm_added THEN
    PERFORM ensure_dm_participation(session_uuid);
  END IF;

  -- Final verification that DM is a participant
  IF NOT EXISTS (
    SELECT 1 FROM session_players 
    WHERE session_id = session_uuid AND user_id = user_uuid AND role = 'dm'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: DM participant creation failed completely';
  END IF;

  -- Update session player count
  UPDATE game_sessions 
  SET 
    current_players = (
      SELECT COUNT(*) FROM session_players 
      WHERE session_id = session_uuid AND role = 'player'
    ),
    is_active = true,
    updated_at = now()
  WHERE id = session_uuid;

  RAISE NOTICE 'Session creation completed successfully: %', session_uuid;
  RETURN session_uuid;
END;
$$;

-- Function to get detailed session info for debugging
CREATE OR REPLACE FUNCTION get_session_debug_info(session_uuid uuid)
RETURNS TABLE(
  session_id uuid,
  session_name text,
  dm_id uuid,
  dm_username text,
  is_active boolean,
  participant_count bigint,
  dm_is_participant boolean,
  all_participants jsonb
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
    dm_user.username,
    gs.is_active,
    COUNT(sp.id) as participant_count,
    EXISTS(
      SELECT 1 FROM session_players sp2 
      WHERE sp2.session_id = gs.id 
      AND sp2.user_id = gs.dungeon_master_id 
      AND sp2.role = 'dm'
    ) as dm_is_participant,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'user_id', sp.user_id,
          'username', u.username,
          'role', sp.role,
          'is_ready', sp.is_ready,
          'character_name', c.name
        )
      ) FILTER (WHERE sp.id IS NOT NULL),
      '[]'::jsonb
    ) as all_participants
  FROM game_sessions gs
  LEFT JOIN users dm_user ON gs.dungeon_master_id = dm_user.id
  LEFT JOIN session_players sp ON gs.id = sp.session_id
  LEFT JOIN users u ON sp.user_id = u.id
  LEFT JOIN characters c ON sp.character_id = c.id
  WHERE gs.id = session_uuid
  GROUP BY gs.id, gs.name, gs.dungeon_master_id, dm_user.username, gs.is_active;
END;
$$;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION ensure_dm_participation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_debug_info(uuid) TO authenticated;

-- Fix ALL existing sessions to ensure DMs are participants
DO $$
DECLARE
  session_record RECORD;
  fixed_count integer := 0;
BEGIN
  RAISE NOTICE 'Fixing existing sessions to ensure DM participation...';
  
  FOR session_record IN 
    SELECT gs.id, gs.dungeon_master_id, gs.name
    FROM game_sessions gs
    WHERE gs.dungeon_master_id IS NOT NULL
  LOOP
    -- Ensure DM participation
    IF ensure_dm_participation(session_record.id) THEN
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed session: % (DM: %)', session_record.name, session_record.dungeon_master_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Fixed % sessions to ensure DM participation', fixed_count;
END $$;

-- Update session player counts for all sessions
UPDATE game_sessions 
SET current_players = (
  SELECT COUNT(*) 
  FROM session_players 
  WHERE session_id = game_sessions.id AND role = 'player'
);

-- Force PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');

-- Final verification
DO $$
DECLARE
  sessions_without_dm_participation integer;
BEGIN
  SELECT COUNT(*) INTO sessions_without_dm_participation
  FROM game_sessions gs
  WHERE gs.dungeon_master_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM session_players sp 
    WHERE sp.session_id = gs.id 
    AND sp.user_id = gs.dungeon_master_id 
    AND sp.role = 'dm'
  );
  
  IF sessions_without_dm_participation > 0 THEN
    RAISE WARNING 'Still have % sessions without DM participation!', sessions_without_dm_participation;
  ELSE
    RAISE NOTICE 'All sessions now have proper DM participation!';
  END IF;
  
  RAISE NOTICE 'DM participation fix completed successfully';
  RAISE NOTICE 'Enhanced session loading with DM verification implemented';
  RAISE NOTICE 'Added debugging functions for troubleshooting';
END $$;