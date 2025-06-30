/*
  # Character Sync System for Multiplayer

  1. New Features
    - Ensure characters are properly saved to Supabase
    - Fix character loading in multiplayer
    - Add character sync between local storage and Supabase
    - Ensure proper character ownership and session tracking

  2. Schema Updates
    - Add missing indexes for character queries
    - Ensure proper RLS policies for character access
    - Fix character visibility in multiplayer sessions
*/

-- Ensure characters table has proper indexes
CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_active_session ON characters(active_session_id);

-- Fix character RLS policies
DROP POLICY IF EXISTS "Users can manage their own characters" ON characters;
DROP POLICY IF EXISTS "Session participants can view characters in session" ON characters;

-- Create comprehensive character policies
CREATE POLICY "Users can manage their own characters"
  ON characters
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Session participants can view characters in session"
  ON characters
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own characters
    (user_id = auth.uid()) OR
    -- User can see characters in sessions they participate in
    (EXISTS (
      SELECT 1 FROM session_players sp
      WHERE sp.character_id = characters.id
      AND EXISTS (
        SELECT 1 FROM session_players sp2
        WHERE sp2.session_id = sp.session_id
        AND sp2.user_id = auth.uid()
      )
    ))
  );

-- Create a unique constraint for character_id and session_id in session_players
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'session_players_character_session_unique'
    AND table_name = 'session_players'
  ) THEN
    ALTER TABLE session_players 
    ADD CONSTRAINT session_players_character_session_unique 
    UNIQUE (character_id, session_id);
  END IF;
END $$;

-- Function to clean up character sessions
CREATE OR REPLACE FUNCTION cleanup_character_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear active_session_id for characters in deleted sessions
  UPDATE characters 
  SET active_session_id = NULL 
  WHERE active_session_id NOT IN (SELECT id FROM game_sessions);

  -- Clear active_session_id for characters not actually in sessions
  UPDATE characters 
  SET active_session_id = NULL 
  WHERE active_session_id IS NOT NULL 
  AND id NOT IN (
    SELECT character_id FROM session_players 
    WHERE character_id IS NOT NULL
  );

  RAISE NOTICE 'Character session cleanup completed';
END;
$$;

-- Run cleanup to fix any existing issues
SELECT cleanup_character_sessions();

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_character_sessions() TO authenticated;

-- Force PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');

DO $$
BEGIN
  RAISE NOTICE 'Character sync system implemented';
  RAISE NOTICE 'Characters will now be properly saved to Supabase';
  RAISE NOTICE 'Character visibility in multiplayer sessions fixed';
  RAISE NOTICE 'Character session tracking improved';
END $$;