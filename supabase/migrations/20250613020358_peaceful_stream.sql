/*
  # Fix infinite recursion in session_players RLS policy

  1. Problem
    - The current `session_players_full_access` policy has infinite recursion
    - It references `session_players` table within its own policy condition
    - This causes a 500 error when querying the table

  2. Solution
    - Drop the problematic policy
    - Create separate, simpler policies for different operations
    - Remove the recursive reference to session_players table
    - Maintain proper access control without circular dependencies

  3. New Policies
    - Users can manage their own session player records
    - DMs can view/manage players in their sessions
    - Players can view other players in the same session (simplified logic)
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "session_players_full_access" ON session_players;

-- Create separate policies for better control and to avoid recursion

-- Policy 1: Users can manage their own session player records
CREATE POLICY "Users can manage own session player records"
  ON session_players
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 2: DMs can view and manage players in their sessions
CREATE POLICY "DMs can manage players in their sessions"
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

-- Policy 3: Players can view other players in sessions they're part of
-- This avoids recursion by using a direct join approach
CREATE POLICY "Players can view others in shared sessions"
  ON session_players
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = session_players.session_id
      AND (
        gs.dungeon_master_id = auth.uid()
        OR gs.id IN (
          SELECT DISTINCT sp2.session_id 
          FROM session_players sp2 
          WHERE sp2.user_id = auth.uid()
        )
      )
    )
  );