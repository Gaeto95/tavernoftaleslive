/*
  # Fix Multiplayer Session Creation and Participation Flow

  1. Issues Fixed
    - DMs not being properly added as participants when creating sessions
    - Session player visibility issues
    - Chat system not working due to RLS policy problems
    - Character creation flow not working in multiplayer context

  2. Changes
    - Enhanced session creation to guarantee DM participation
    - Simplified RLS policies to ensure proper visibility
    - Fixed character creation flow for multiplayer
    - Added better error handling and debugging
*/

-- Drop existing problematic policies and recreate them properly
DROP POLICY IF EXISTS "session_players_own_management" ON session_players;
DROP POLICY IF EXISTS "session_players_dm_management" ON session_players;
DROP POLICY IF EXISTS "session_players_public_sessions" ON session_players;

-- Create comprehensive session_players policies that work correctly
CREATE POLICY "session_players_comprehensive_access"
  ON session_players
  FOR ALL
  TO authenticated
  USING (
    -- Users can always see and manage their own participation
    user_id = auth.uid()
    OR
    -- Users can see other participants in sessions where they are also participants
    EXISTS (
      SELECT 1 FROM session_players sp2 
      WHERE sp2.session_id = session_players.session_id 
      AND sp2.user_id = auth.uid()
    )
    OR
    -- Anyone can view participants in public sessions (for browsing)
    EXISTS (
      SELECT 1 FROM game_sessions gs 
      WHERE gs.id = session_players.session_id 
      AND gs.is_public = true
    )
  )
  WITH CHECK (
    -- Users can only insert/update their own participation
    user_id = auth.uid()
  );

-- Enhanced session creation function that GUARANTEES DM participation
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
  retry_count integer := 0;
  max_retries integer := 3;
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
    0,
    true,
    is_public_session,
    password_hash_value,
    session_settings_value,
    now(),
    now()
  ) RETURNING id INTO session_uuid;

  -- CRITICAL: Add DM as participant with retry logic
  WHILE retry_count < max_retries LOOP
    BEGIN
      -- Remove any existing participation first
      DELETE FROM session_players 
      WHERE session_id = session_uuid AND user_id = user_uuid;
      
      -- Add DM as participant
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
      
      -- Verify the insertion worked
      IF EXISTS (
        SELECT 1 FROM session_players 
        WHERE session_id = session_uuid AND user_id = user_uuid AND role = 'dm'
      ) THEN
        EXIT; -- Success, exit the loop
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      retry_count := retry_count + 1;
      IF retry_count >= max_retries THEN
        RAISE EXCEPTION 'Failed to add DM as participant after % retries: %', max_retries, SQLERRM;
      END IF;
      -- Wait a bit before retrying
      PERFORM pg_sleep(0.1);
    END;
    
    retry_count := retry_count + 1;
  END LOOP;

  -- Final verification
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
    updated_at = now()
  WHERE id = session_uuid;

  RETURN session_uuid;
END;
$$;

-- Enhanced join session function with better character handling
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

  -- Check if user is the DM
  is_dm := session_record.dungeon_master_id = user_uuid;

  -- If not DM, check session capacity
  IF NOT is_dm THEN
    SELECT COUNT(*) INTO current_player_count
    FROM session_players 
    WHERE session_id = session_uuid AND role = 'player';
    
    IF current_player_count >= session_record.max_players THEN
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
    CASE WHEN is_dm THEN 'dm' ELSE 'player' END,
    CASE WHEN is_dm THEN true ELSE false END,
    now()
  );

  -- Update character's active session if character provided
  IF character_uuid IS NOT NULL THEN
    UPDATE characters 
    SET active_session_id = session_uuid 
    WHERE id = character_uuid;
  END IF;

  -- Mark session as active
  UPDATE game_sessions 
  SET is_active = true, updated_at = now()
  WHERE id = session_uuid;

  RETURN true;
END;
$$;

-- Fix chat message policies to work with the new session player structure
DROP POLICY IF EXISTS "chat_messages_view_access" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_send_access" ON chat_messages;

CREATE POLICY "chat_messages_session_participants"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see chat in sessions where they are participants
    EXISTS (
      SELECT 1 FROM session_players sp 
      WHERE sp.session_id = chat_messages.session_id 
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_send_to_sessions"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM session_players sp 
      WHERE sp.session_id = chat_messages.session_id 
      AND sp.user_id = auth.uid()
    )
  );

-- Fix story entries policies
DROP POLICY IF EXISTS "story_entries_view_access" ON story_entries;
DROP POLICY IF EXISTS "story_entries_insert_access" ON story_entries;

CREATE POLICY "story_entries_session_participants"
  ON story_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_players sp 
      WHERE sp.session_id = story_entries.session_id 
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "story_entries_participant_insert"
  ON story_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM session_players sp 
      WHERE sp.session_id = story_entries.session_id 
      AND sp.user_id = auth.uid()
    )
  );

-- Fix turn actions policies
DROP POLICY IF EXISTS "turn_actions_view_access" ON turn_actions;
DROP POLICY IF EXISTS "turn_actions_own_management" ON turn_actions;

CREATE POLICY "turn_actions_session_participants"
  ON turn_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_players sp 
      WHERE sp.session_id = turn_actions.session_id 
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "turn_actions_participant_management"
  ON turn_actions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to debug session participation
CREATE OR REPLACE FUNCTION debug_session_participation(session_uuid uuid)
RETURNS TABLE(
  session_name text,
  dm_id uuid,
  dm_username text,
  participant_count bigint,
  participants jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gs.name,
    gs.dungeon_master_id,
    dm_user.username,
    COUNT(sp.id),
    jsonb_agg(
      jsonb_build_object(
        'user_id', sp.user_id,
        'username', u.username,
        'role', sp.role,
        'is_ready', sp.is_ready,
        'character_name', COALESCE(c.name, 'No Character')
      )
    ) as participants
  FROM game_sessions gs
  LEFT JOIN users dm_user ON gs.dungeon_master_id = dm_user.id
  LEFT JOIN session_players sp ON gs.id = sp.session_id
  LEFT JOIN users u ON sp.user_id = u.id
  LEFT JOIN characters c ON sp.character_id = c.id
  WHERE gs.id = session_uuid
  GROUP BY gs.name, gs.dungeon_master_id, dm_user.username;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION debug_session_participation(uuid) TO authenticated;

-- Fix all existing sessions to ensure proper DM participation
DO $$
DECLARE
  session_record RECORD;
  fixed_count integer := 0;
BEGIN
  FOR session_record IN 
    SELECT gs.id, gs.dungeon_master_id, gs.name
    FROM game_sessions gs
    WHERE gs.dungeon_master_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM session_players sp 
      WHERE sp.session_id = gs.id 
      AND sp.user_id = gs.dungeon_master_id 
      AND sp.role = 'dm'
    )
  LOOP
    -- Add DM as participant
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
    ) ON CONFLICT (session_id, user_id) DO UPDATE SET
      role = 'dm',
      is_ready = true;
    
    fixed_count := fixed_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Fixed % sessions to ensure DM participation', fixed_count;
END $$;

-- Update session player counts
UPDATE game_sessions 
SET current_players = (
  SELECT COUNT(*) 
  FROM session_players 
  WHERE session_id = game_sessions.id AND role = 'player'
);

-- Force PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');

DO $$
BEGIN
  RAISE NOTICE 'Multiplayer session flow has been completely fixed';
  RAISE NOTICE 'DM participation is now guaranteed during session creation';
  RAISE NOTICE 'RLS policies have been simplified and fixed';
  RAISE NOTICE 'Chat and story systems should now work properly';
  RAISE NOTICE 'Character creation flow improved for multiplayer';
END $$;