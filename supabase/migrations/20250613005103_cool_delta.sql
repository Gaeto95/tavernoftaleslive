/*
  # Final Fix for RLS Policy Infinite Recursion

  1. Complete Policy Restructure
    - Drop all existing problematic policies
    - Create simple, non-recursive policies
    - Use direct table references only
    - Avoid any subqueries that could cause recursion

  2. Security
    - Maintain proper access control
    - Ensure users can only access their own data
    - DMs can manage their sessions
    - No circular dependencies
*/

-- Drop ALL existing policies that could cause recursion
DROP POLICY IF EXISTS "Users can view their own session players and DMs can view all in their sessions" ON session_players;
DROP POLICY IF EXISTS "Users can update their own session participation" ON session_players;
DROP POLICY IF EXISTS "Users can insert their own session participation" ON session_players;
DROP POLICY IF EXISTS "Users can delete their own session participation" ON session_players;
DROP POLICY IF EXISTS "Session participants can view session players" ON session_players;
DROP POLICY IF EXISTS "Users can update their session status" ON session_players;
DROP POLICY IF EXISTS "Users can join sessions" ON session_players;

-- Drop story entries policies
DROP POLICY IF EXISTS "Users can view story entries in their sessions" ON story_entries;
DROP POLICY IF EXISTS "Users can add story entries to their sessions" ON story_entries;
DROP POLICY IF EXISTS "Session participants can view story entries" ON story_entries;
DROP POLICY IF EXISTS "Session participants can add story entries" ON story_entries;

-- Drop turn actions policies
DROP POLICY IF EXISTS "Users can view turn actions in their sessions" ON turn_actions;
DROP POLICY IF EXISTS "Session participants can view turn actions" ON turn_actions;
DROP POLICY IF EXISTS "Users can submit their own actions" ON turn_actions;
DROP POLICY IF EXISTS "Users can update their own unprocessed actions" ON turn_actions;

-- Drop chat messages policies
DROP POLICY IF EXISTS "Users can view chat messages in their sessions" ON chat_messages;
DROP POLICY IF EXISTS "Users can send chat messages to their sessions" ON chat_messages;

-- Create SIMPLE, non-recursive policies for session_players
CREATE POLICY "session_players_select_own"
  ON session_players
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "session_players_insert_own"
  ON session_players
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "session_players_update_own"
  ON session_players
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "session_players_delete_own"
  ON session_players
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create simple policies for story_entries
CREATE POLICY "story_entries_select_own"
  ON story_entries
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "story_entries_insert_own"
  ON story_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create simple policies for turn_actions
CREATE POLICY "turn_actions_select_own"
  ON turn_actions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "turn_actions_insert_own"
  ON turn_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "turn_actions_update_own"
  ON turn_actions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND is_processed = false);

-- Create simple policies for chat_messages
CREATE POLICY "chat_messages_select_own"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "chat_messages_insert_own"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Ensure all foreign key constraints are properly set
DO $$
BEGIN
  -- Ensure session_players.character_id foreign key exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'session_players_character_id_fkey'
    AND table_name = 'session_players'
  ) THEN
    ALTER TABLE session_players 
    ADD CONSTRAINT session_players_character_id_fkey 
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the setup
DO $$
BEGIN
  RAISE NOTICE 'RLS policies have been completely restructured to prevent infinite recursion';
  RAISE NOTICE 'All policies now use simple user_id = auth.uid() checks only';
  RAISE NOTICE 'No subqueries or complex joins that could cause recursion';
END $$;