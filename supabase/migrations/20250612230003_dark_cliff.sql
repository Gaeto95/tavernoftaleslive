/*
  # Fix Session Players RLS Policy Recursion and Foreign Key Issues

  1. Issues Fixed
    - Remove infinite recursion in session_players policies
    - Ensure foreign key relationship is properly recognized by PostgREST
    - Simplify policy logic to avoid self-referential queries

  2. Changes
    - Drop all existing problematic policies
    - Create new non-recursive policies
    - Ensure foreign key constraint exists and is recognized
    - Force schema cache refresh
*/

-- Drop all existing problematic policies for session_players
DROP POLICY IF EXISTS "Users can view session players where they participate" ON session_players;
DROP POLICY IF EXISTS "Users can update their own session participation" ON session_players;
DROP POLICY IF EXISTS "Session participants can view session players" ON session_players;
DROP POLICY IF EXISTS "Users can update their session status" ON session_players;

-- Drop and recreate the foreign key constraint to ensure it's properly recognized
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'session_players_character_id_fkey'
    AND table_name = 'session_players'
  ) THEN
    ALTER TABLE session_players DROP CONSTRAINT session_players_character_id_fkey;
  END IF;
  
  -- Ensure character_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_players' AND column_name = 'character_id'
  ) THEN
    ALTER TABLE session_players ADD COLUMN character_id uuid;
  END IF;
END $$;

-- Recreate the foreign key constraint
ALTER TABLE session_players 
ADD CONSTRAINT session_players_character_id_fkey 
FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_session_players_character_id ON session_players(character_id);

-- Create new non-recursive policies for session_players
CREATE POLICY "Users can view their own session players and DMs can view all in their sessions"
  ON session_players
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own session participation
    user_id = auth.uid()
    OR 
    -- DMs can see all players in sessions they manage
    session_id IN (SELECT id FROM game_sessions WHERE dungeon_master_id = auth.uid())
  );

CREATE POLICY "Users can update their own session participation"
  ON session_players
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own session participation"
  ON session_players
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own session participation"
  ON session_players
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Fix turn_actions policies to avoid similar recursion issues
DROP POLICY IF EXISTS "Users can view turn actions in their sessions" ON turn_actions;
DROP POLICY IF EXISTS "Session participants can view turn actions" ON turn_actions;

CREATE POLICY "Users can view turn actions in their sessions"
  ON turn_actions
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own actions
    user_id = auth.uid()
    OR
    -- DMs can see all actions in sessions they manage
    session_id IN (SELECT id FROM game_sessions WHERE dungeon_master_id = auth.uid())
  );

-- Fix story_entries policies for consistency
DROP POLICY IF EXISTS "Users can view story entries in their sessions" ON story_entries;
DROP POLICY IF EXISTS "Session participants can view story entries" ON story_entries;

CREATE POLICY "Users can view story entries in their sessions"
  ON story_entries
  FOR SELECT
  TO authenticated
  USING (
    -- DMs can see all story entries in sessions they manage
    session_id IN (SELECT id FROM game_sessions WHERE dungeon_master_id = auth.uid())
    OR
    -- Players can see story entries in sessions where they participate
    session_id IN (SELECT session_id FROM session_players WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can add story entries to their sessions" ON story_entries;
DROP POLICY IF EXISTS "Session participants can add story entries" ON story_entries;

CREATE POLICY "Users can add story entries to their sessions"
  ON story_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND (
      -- DMs can add story entries to sessions they manage
      session_id IN (SELECT id FROM game_sessions WHERE dungeon_master_id = auth.uid())
      OR
      -- Players can add story entries to sessions where they participate
      session_id IN (SELECT session_id FROM session_players WHERE user_id = auth.uid())
    )
  );

-- Force PostgREST to reload its schema cache multiple times to ensure recognition
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'session_players_character_id_fkey'
    AND table_name = 'session_players'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    RAISE EXCEPTION 'Foreign key constraint was not created successfully';
  END IF;
  
  RAISE NOTICE 'Foreign key constraint verified successfully';
END $$;

-- Additional verification of the relationship
DO $$
DECLARE
  constraint_count integer;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu_from 
    ON rc.constraint_name = kcu_from.constraint_name
  JOIN information_schema.key_column_usage kcu_to 
    ON rc.unique_constraint_name = kcu_to.constraint_name
  WHERE kcu_from.table_name = 'session_players'
    AND kcu_from.column_name = 'character_id'
    AND kcu_to.table_name = 'characters'
    AND kcu_to.column_name = 'id';
    
  IF constraint_count = 0 THEN
    RAISE EXCEPTION 'Foreign key relationship verification failed';
  END IF;
  
  RAISE NOTICE 'Foreign key relationship successfully established and verified';
END $$;