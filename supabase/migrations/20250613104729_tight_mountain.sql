/*
  # Fix infinite recursion in session_players RLS policy

  1. Problem
    - The current `session_players_comprehensive_access` policy creates infinite recursion
    - It queries `session_players` within a policy that applies to `session_players`
    - This causes the database to loop infinitely when checking permissions

  2. Solution
    - Replace the problematic policy with separate, non-recursive policies
    - Use direct user authentication checks instead of self-referential queries
    - Separate read and write permissions for better control

  3. Changes
    - Drop the problematic comprehensive policy
    - Create separate policies for SELECT, INSERT, UPDATE, DELETE
    - Use auth.uid() directly without circular table references
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "session_players_comprehensive_access" ON session_players;

-- Create separate, non-recursive policies

-- Users can read session players if they are:
-- 1. The user themselves
-- 2. In a public session
-- 3. The dungeon master of the session
CREATE POLICY "session_players_read_access"
  ON session_players
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM game_sessions gs 
      WHERE gs.id = session_players.session_id 
      AND (gs.is_public = true OR gs.dungeon_master_id = auth.uid())
    )
  );

-- Users can only insert their own session player records
CREATE POLICY "session_players_insert_own"
  ON session_players
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own session player records
CREATE POLICY "session_players_update_own"
  ON session_players
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own session player records
-- DMs can also remove players from their sessions
CREATE POLICY "session_players_delete_access"
  ON session_players
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM game_sessions gs 
      WHERE gs.id = session_players.session_id 
      AND gs.dungeon_master_id = auth.uid()
    )
  );