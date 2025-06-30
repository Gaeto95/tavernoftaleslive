/*
  # Create story entries table for session story tracking

  1. New Tables
    - `story_entries`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references game_sessions)
      - `character_id` (uuid, references characters, nullable for DM entries)
      - `type` (text) - 'player', 'dm', or 'system'
      - `content` (text)
      - `voice_url` (text, nullable)
      - `timestamp` (timestamptz)

  2. Security
    - Enable RLS on `story_entries` table
    - Add policies for session participants to manage entries
*/

CREATE TABLE IF NOT EXISTS story_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('player', 'dm', 'system')),
  content text NOT NULL,
  voice_url text,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE story_entries ENABLE ROW LEVEL SECURITY;

-- Session participants can manage story entries
CREATE POLICY "Session participants can manage story entries"
  ON story_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs 
      WHERE gs.id = story_entries.session_id 
      AND (
        gs.dungeon_master_id = auth.uid() OR 
        auth.uid()::text = ANY(SELECT jsonb_array_elements_text(gs.players))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions gs 
      WHERE gs.id = story_entries.session_id 
      AND (
        gs.dungeon_master_id = auth.uid() OR 
        auth.uid()::text = ANY(SELECT jsonb_array_elements_text(gs.players))
      )
    )
  );

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS story_entries_session_id_idx ON story_entries(session_id);
CREATE INDEX IF NOT EXISTS story_entries_timestamp_idx ON story_entries(timestamp);
CREATE INDEX IF NOT EXISTS story_entries_character_id_idx ON story_entries(character_id);