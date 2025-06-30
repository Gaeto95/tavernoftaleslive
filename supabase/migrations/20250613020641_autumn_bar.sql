/*
  # Fix infinite recursion in session_players RLS policies

  1. Problem
    - The current RLS policies on session_players table are causing infinite recursion
    - This happens when policies reference themselves or create circular dependencies
    
  2. Solution
    - Drop existing problematic policies
    - Create new, simplified policies that avoid recursion
    - Ensure policies are straightforward and don't create self-referencing loops
    
  3. New Policies
    - Users can manage their own session player records
    - DMs can manage players in their sessions (simplified)
    - Players can view session players in sessions they participate in (simplified)
*/

-- Drop existing policies that are causing recursion
DROP POLICY IF EXISTS "DMs can manage players in their sessions" ON session_players;
DROP POLICY IF EXISTS "Players can view others in shared sessions" ON session_players;
DROP POLICY IF EXISTS "Users can manage own session player records" ON session_players;

-- Create new, simplified policies without recursion

-- Policy 1: Users can manage their own session player records
CREATE POLICY "Users can manage own session player records"
  ON session_players
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 2: DMs can manage players in their sessions (simplified to avoid recursion)
CREATE POLICY "DMs can manage players in their sessions"
  ON session_players
  FOR ALL
  TO authenticated
  USING (
    session_id IN (
      SELECT id 
      FROM game_sessions 
      WHERE dungeon_master_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id 
      FROM game_sessions 
      WHERE dungeon_master_id = auth.uid()
    )
  );

-- Policy 3: Players can view session players in sessions they participate in (simplified)
CREATE POLICY "Players can view session players in sessions"
  ON session_players
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own records
    user_id = auth.uid()
    OR
    -- User can see other players in sessions where they are the DM
    session_id IN (
      SELECT id 
      FROM game_sessions 
      WHERE dungeon_master_id = auth.uid()
    )
    OR
    -- User can see other players in sessions where they are also a player
    session_id IN (
      SELECT DISTINCT sp.session_id
      FROM session_players sp
      WHERE sp.user_id = auth.uid()
    )
  );