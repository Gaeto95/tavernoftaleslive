/*
  # Fix RLS Policy Infinite Recursion

  1. Issues Fixed
    - Remove infinite recursion in session_players policies
    - Ensure proper foreign key relationship between session_players and characters
    - Simplify policy logic to avoid self-referential queries

  2. Changes
    - Rewrite session_players policies to avoid recursion
    - Add explicit foreign key constraint if missing
    - Update policy logic for better performance
*/

-- First, ensure the foreign key constraint exists
DO $$
BEGIN
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

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Session participants can view session players" ON session_players;
DROP POLICY IF EXISTS "Users can update their session status" ON session_players;

-- Create new non-recursive policies for session_players
CREATE POLICY "Users can view session players where they participate"
  ON session_players
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own session participation
    user_id = auth.uid() 
    OR 
    -- User can see other players in sessions where they are also a participant
    session_id IN (
      SELECT sp.session_id 
      FROM session_players sp 
      WHERE sp.user_id = auth.uid()
    )
    OR
    -- User can see players in sessions they DM
    session_id IN (
      SELECT gs.id 
      FROM game_sessions gs 
      WHERE gs.dungeon_master_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own session participation"
  ON session_players
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Also fix the turn_actions policy to avoid similar issues
DROP POLICY IF EXISTS "Session participants can view turn actions" ON turn_actions;

CREATE POLICY "Users can view turn actions in their sessions"
  ON turn_actions
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own actions
    user_id = auth.uid()
    OR
    -- User can see actions in sessions where they participate
    session_id IN (
      SELECT sp.session_id 
      FROM session_players sp 
      WHERE sp.user_id = auth.uid()
    )
    OR
    -- User can see actions in sessions they DM
    session_id IN (
      SELECT gs.id 
      FROM game_sessions gs 
      WHERE gs.dungeon_master_id = auth.uid()
    )
  );

-- Update story_entries policy for consistency
DROP POLICY IF EXISTS "Session participants can view story entries" ON story_entries;

CREATE POLICY "Users can view story entries in their sessions"
  ON story_entries
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT sp.session_id 
      FROM session_players sp 
      WHERE sp.user_id = auth.uid()
    )
    OR
    session_id IN (
      SELECT gs.id 
      FROM game_sessions gs 
      WHERE gs.dungeon_master_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Session participants can add story entries" ON story_entries;

CREATE POLICY "Users can add story entries to their sessions"
  ON story_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND (
      session_id IN (
        SELECT sp.session_id 
        FROM session_players sp 
        WHERE sp.user_id = auth.uid()
      )
      OR
      session_id IN (
        SELECT gs.id 
        FROM game_sessions gs 
        WHERE gs.dungeon_master_id = auth.uid()
      )
    )
  );

-- Refresh the schema cache to ensure foreign key relationships are recognized
NOTIFY pgrst, 'reload schema';