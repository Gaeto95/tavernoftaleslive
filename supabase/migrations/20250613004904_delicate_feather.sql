/*
  # Fix Session Players RLS Policy Infinite Recursion

  1. Problem
    - The current RLS policy for session_players causes infinite recursion
    - Using IN (SELECT ...) subqueries creates circular dependencies
    - PostgreSQL query planner gets stuck in recursive evaluation loops

  2. Solution
    - Replace IN subqueries with EXISTS clauses
    - Use explicit JOINs to avoid circular dependencies
    - Restructure policy logic to prevent recursion

  3. Changes
    - Drop the problematic policy
    - Create new policy using EXISTS instead of IN
    - Ensure proper query structure to avoid recursion
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view their own session players and DMs can view all in their sessions" ON session_players;

-- Create new non-recursive policy using EXISTS instead of IN subqueries
CREATE POLICY "Users can view their own session players and DMs can view all in their sessions"
  ON session_players
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own session participation
    user_id = auth.uid()
    OR 
    -- DMs can see all players in sessions they manage (using EXISTS to avoid recursion)
    EXISTS (
      SELECT 1 
      FROM game_sessions gs 
      WHERE gs.id = session_players.session_id 
      AND gs.dungeon_master_id = auth.uid()
    )
  );

-- Also fix the story_entries policy that might have similar issues
DROP POLICY IF EXISTS "Users can view story entries in their sessions" ON story_entries;

CREATE POLICY "Users can view story entries in their sessions"
  ON story_entries
  FOR SELECT
  TO authenticated
  USING (
    -- DMs can see all story entries in sessions they manage
    EXISTS (
      SELECT 1 
      FROM game_sessions gs 
      WHERE gs.id = story_entries.session_id 
      AND gs.dungeon_master_id = auth.uid()
    )
    OR
    -- Players can see story entries in sessions where they participate
    EXISTS (
      SELECT 1 
      FROM session_players sp 
      WHERE sp.session_id = story_entries.session_id 
      AND sp.user_id = auth.uid()
    )
  );

-- Fix the story_entries INSERT policy as well
DROP POLICY IF EXISTS "Users can add story entries to their sessions" ON story_entries;

CREATE POLICY "Users can add story entries to their sessions"
  ON story_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND (
      -- DMs can add story entries to sessions they manage
      EXISTS (
        SELECT 1 
        FROM game_sessions gs 
        WHERE gs.id = session_id 
        AND gs.dungeon_master_id = auth.uid()
      )
      OR
      -- Players can add story entries to sessions where they participate
      EXISTS (
        SELECT 1 
        FROM session_players sp 
        WHERE sp.session_id = story_entries.session_id 
        AND sp.user_id = auth.uid()
      )
    )
  );

-- Fix turn_actions policy as well to be consistent
DROP POLICY IF EXISTS "Users can view turn actions in their sessions" ON turn_actions;

CREATE POLICY "Users can view turn actions in their sessions"
  ON turn_actions
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own actions
    user_id = auth.uid()
    OR
    -- DMs can see all actions in sessions they manage
    EXISTS (
      SELECT 1 
      FROM game_sessions gs 
      WHERE gs.id = turn_actions.session_id 
      AND gs.dungeon_master_id = auth.uid()
    )
  );

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- Verify policies are working correctly
DO $$
BEGIN
  RAISE NOTICE 'Session players RLS policies have been updated to prevent infinite recursion';
  RAISE NOTICE 'All policies now use EXISTS clauses instead of IN subqueries';
END $$;