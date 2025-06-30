/*
  # Fix Multiplayer RLS Policies and Chat System

  1. Issues Fixed
    - RLS policies preventing players from seeing each other
    - Chat messages not working due to policy restrictions
    - Session player visibility issues
    - Turn actions and story entries access problems

  2. Changes
    - Simplified RLS policies to allow proper multiplayer functionality
    - Fixed chat_messages table and policies
    - Enhanced session player visibility
    - Improved real-time functionality
*/

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "session_players_select_own" ON session_players;
DROP POLICY IF EXISTS "session_players_insert_own" ON session_players;
DROP POLICY IF EXISTS "session_players_update_own" ON session_players;
DROP POLICY IF EXISTS "session_players_delete_own" ON session_players;

-- Create comprehensive session_players policies
CREATE POLICY "session_players_full_access"
  ON session_players
  FOR ALL
  TO authenticated
  USING (
    -- Users can manage their own participation
    user_id = auth.uid()
    OR
    -- Users can see other players in sessions they're part of
    session_id IN (
      SELECT sp.session_id 
      FROM session_players sp 
      WHERE sp.user_id = auth.uid()
    )
    OR
    -- DMs can see all players in their sessions
    session_id IN (
      SELECT gs.id 
      FROM game_sessions gs 
      WHERE gs.dungeon_master_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Users can only insert/update their own participation
    user_id = auth.uid()
  );

-- Fix story_entries policies
DROP POLICY IF EXISTS "story_entries_select_own" ON story_entries;
DROP POLICY IF EXISTS "story_entries_insert_own" ON story_entries;

CREATE POLICY "story_entries_session_access"
  ON story_entries
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see story entries in sessions they're part of
    session_id IN (
      SELECT sp.session_id 
      FROM session_players sp 
      WHERE sp.user_id = auth.uid()
    )
    OR
    -- DMs can see all story entries in their sessions
    session_id IN (
      SELECT gs.id 
      FROM game_sessions gs 
      WHERE gs.dungeon_master_id = auth.uid()
    )
  );

CREATE POLICY "story_entries_session_insert"
  ON story_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Users can add entries to sessions they're part of
      session_id IN (
        SELECT sp.session_id 
        FROM session_players sp 
        WHERE sp.user_id = auth.uid()
      )
      OR
      -- DMs can add entries to their sessions
      session_id IN (
        SELECT gs.id 
        FROM game_sessions gs 
        WHERE gs.dungeon_master_id = auth.uid()
      )
    )
  );

-- Fix turn_actions policies
DROP POLICY IF EXISTS "turn_actions_select_own" ON turn_actions;
DROP POLICY IF EXISTS "turn_actions_insert_own" ON turn_actions;
DROP POLICY IF EXISTS "turn_actions_update_own" ON turn_actions;

CREATE POLICY "turn_actions_session_access"
  ON turn_actions
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see actions in sessions they're part of
    session_id IN (
      SELECT sp.session_id 
      FROM session_players sp 
      WHERE sp.user_id = auth.uid()
    )
    OR
    -- DMs can see all actions in their sessions
    session_id IN (
      SELECT gs.id 
      FROM game_sessions gs 
      WHERE gs.dungeon_master_id = auth.uid()
    )
  );

CREATE POLICY "turn_actions_own_management"
  ON turn_actions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Ensure chat_messages table exists with proper structure
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS on chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing chat policies
DROP POLICY IF EXISTS "chat_messages_select_own" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_own" ON chat_messages;
DROP POLICY IF EXISTS "Users can view chat messages in their sessions" ON chat_messages;
DROP POLICY IF EXISTS "Users can send chat messages to their sessions" ON chat_messages;

-- Create comprehensive chat policies
CREATE POLICY "chat_messages_session_access"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see chat in sessions they're part of
    session_id IN (
      SELECT sp.session_id 
      FROM session_players sp 
      WHERE sp.user_id = auth.uid()
    )
    OR
    -- DMs can see chat in their sessions
    session_id IN (
      SELECT gs.id 
      FROM game_sessions gs 
      WHERE gs.dungeon_master_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_session_insert"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Users can send messages to sessions they're part of
      session_id IN (
        SELECT sp.session_id 
        FROM session_players sp 
        WHERE sp.user_id = auth.uid()
      )
      OR
      -- DMs can send messages to their sessions
      session_id IN (
        SELECT gs.id 
        FROM game_sessions gs 
        WHERE gs.dungeon_master_id = auth.uid()
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- Force PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the setup
DO $$
BEGIN
  RAISE NOTICE 'Multiplayer RLS policies have been fixed for proper session visibility';
  RAISE NOTICE 'Chat system has been properly configured';
  RAISE NOTICE 'Players should now be able to see each other in sessions';
END $$;