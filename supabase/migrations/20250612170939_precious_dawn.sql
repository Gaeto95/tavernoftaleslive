/*
  # Create characters table for D&D character management

  1. New Tables
    - `characters`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `class_id` (text)
      - `level` (integer)
      - `stats` (jsonb) - stores all ability scores
      - `hit_points` (integer)
      - `max_hit_points` (integer)
      - `armor_class` (integer)
      - `proficiency_bonus` (integer)
      - `experience` (integer)
      - `background` (text)
      - `inventory` (jsonb) - stores inventory items
      - `spells` (jsonb) - stores spell list
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `characters` table
    - Add policy for users to manage their own characters
*/

CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  class_id text NOT NULL,
  level integer DEFAULT 1,
  stats jsonb NOT NULL DEFAULT '{}',
  hit_points integer NOT NULL DEFAULT 1,
  max_hit_points integer NOT NULL DEFAULT 1,
  armor_class integer NOT NULL DEFAULT 10,
  proficiency_bonus integer NOT NULL DEFAULT 2,
  experience integer DEFAULT 0,
  background text,
  inventory jsonb DEFAULT '[]',
  spells jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own characters"
  ON characters
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS characters_user_id_idx ON characters(user_id);
CREATE INDEX IF NOT EXISTS characters_updated_at_idx ON characters(updated_at);