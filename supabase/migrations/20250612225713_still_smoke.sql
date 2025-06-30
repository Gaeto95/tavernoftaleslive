/*
  # Fix Foreign Key Relationship Between session_players and characters

  1. Issues Fixed
    - Ensure proper foreign key constraint between session_players and characters
    - Force PostgREST schema cache refresh
    - Verify constraint creation with proper error handling

  2. Changes
    - Drop and recreate foreign key constraint with proper naming
    - Add explicit schema cache refresh commands
    - Ensure constraint is properly recognized by PostgREST
*/

-- First, drop the existing constraint if it exists to avoid conflicts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'session_players_character_id_fkey'
    AND table_name = 'session_players'
  ) THEN
    ALTER TABLE session_players DROP CONSTRAINT session_players_character_id_fkey;
  END IF;
END $$;

-- Ensure the character_id column exists and has the correct type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_players' AND column_name = 'character_id'
  ) THEN
    ALTER TABLE session_players ADD COLUMN character_id uuid;
  END IF;
END $$;

-- Create the foreign key constraint with explicit naming
ALTER TABLE session_players 
ADD CONSTRAINT session_players_character_id_fkey 
FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL;

-- Verify the constraint was created
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
END $$;

-- Force PostgREST to reload its schema cache
-- This is critical for the API to recognize the new relationship
NOTIFY pgrst, 'reload schema';

-- Additional schema refresh commands for different PostgREST versions
SELECT pg_notify('pgrst', 'reload schema');

-- Create an index on the foreign key for better performance
CREATE INDEX IF NOT EXISTS idx_session_players_character_id ON session_players(character_id);

-- Verify the relationship is properly established by checking system catalogs
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