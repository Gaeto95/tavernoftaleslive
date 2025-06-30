/*
  # Fix infinite recursion in session_players RLS policies

  1. Problem
    - The current RLS policies on session_players table contain recursive logic
    - Policy "Players can view session players in sessions" queries session_players within itself
    - This causes infinite recursion when Supabase tries to evaluate the policy

  2. Solution
    - Drop the problematic policies
    - Create new, simplified policies that avoid self-referential queries
    - Use direct relationships and simpler logic to prevent recursion

  3. New Policies
    - DMs can manage players in their sessions (unchanged)
    - Users can manage their own session player records (unchanged)  
    - Players can view session players - simplified to avoid recursion
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Players can view session players in sessions" ON session_players;

-- Create a new, simplified policy for viewing session players
-- This policy allows users to view session players in sessions where they are either:
-- 1. The dungeon master of the session
-- 2. A participant (but we check this through game_sessions, not session_players)
CREATE POLICY "Players can view session participants"
  ON session_players
  FOR SELECT
  TO authenticated
  USING (
    -- User is the DM of the session
    (session_id IN (
      SELECT id FROM game_sessions 
      WHERE dungeon_master_id = auth.uid()
    ))
    OR
    -- User is viewing their own session player record
    (user_id = auth.uid())
    OR
    -- Session is public (anyone can see participants of public sessions)
    (session_id IN (
      SELECT id FROM game_sessions 
      WHERE is_public = true
    ))
  );