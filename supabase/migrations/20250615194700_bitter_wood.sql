/*
  # Add Character Appearances Table

  1. New Tables
    - `character_appearances` - Stores 3D character appearance data
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `appearance_data` (jsonb) - stores all appearance settings
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `character_appearances` table
    - Add policy for users to manage their own appearances
    - Add policy for session participants to view appearances

  3. Relationships
    - Link characters to appearances
    - Add appearance_id to characters table
*/

-- Create character appearances table
CREATE TABLE IF NOT EXISTS character_appearances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  appearance_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add appearance_id to characters table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'appearance_id'
  ) THEN
    ALTER TABLE characters ADD COLUMN appearance_id uuid REFERENCES character_appearances(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS on character_appearances
ALTER TABLE character_appearances ENABLE ROW LEVEL SECURITY;

-- Create policies for character_appearances
CREATE POLICY "Users can manage their own appearances"
  ON character_appearances
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Session participants can view appearances"
  ON character_appearances
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own appearances
    user_id = auth.uid()
    OR
    -- User can see appearances of characters in sessions they participate in
    id IN (
      SELECT c.appearance_id
      FROM characters c
      JOIN session_players sp ON c.id = sp.character_id
      WHERE sp.session_id IN (
        SELECT sp2.session_id
        FROM session_players sp2
        WHERE sp2.user_id = auth.uid()
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_character_appearances_user_id ON character_appearances(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_appearance_id ON characters(appearance_id);

-- Add updated_at trigger
CREATE TRIGGER trigger_update_character_appearances_updated_at
  BEFORE UPDATE ON character_appearances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON character_appearances TO authenticated;