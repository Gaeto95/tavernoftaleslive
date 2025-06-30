/*
  # Create game sessions table for multiplayer D&D sessions

  1. New Tables
    - `game_sessions`
      - `id` (uuid, primary key)
      - `name` (text)
      - `dungeon_master_id` (uuid, references auth.users)
      - `players` (jsonb) - array of player user IDs
      - `characters` (jsonb) - array of character IDs in session
      - `current_scene` (text)
      - `story_history` (jsonb) - array of story entries
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `game_sessions` table
    - Add policies for DMs to manage their sessions
    - Add policies for players to view sessions they're part of
*/

CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  dungeon_master_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  players jsonb DEFAULT '[]',
  characters jsonb DEFAULT '[]',
  current_scene text DEFAULT '',
  story_history jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- DMs can manage their own sessions
CREATE POLICY "DMs can manage their own sessions"
  ON game_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = dungeon_master_id)
  WITH CHECK (auth.uid() = dungeon_master_id);

-- Players can view sessions they're part of
CREATE POLICY "Players can view their sessions"
  ON game_sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = dungeon_master_id OR 
    auth.uid()::text = ANY(SELECT jsonb_array_elements_text(players))
  );

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS game_sessions_dm_id_idx ON game_sessions(dungeon_master_id);
CREATE INDEX IF NOT EXISTS game_sessions_active_idx ON game_sessions(is_active);
CREATE INDEX IF NOT EXISTS game_sessions_updated_at_idx ON game_sessions(updated_at);