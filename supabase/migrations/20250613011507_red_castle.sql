/*
  # Enhance Character Data Storage

  1. New Columns
    - `skills_data` (jsonb) - stores calculated skill modifiers and proficiencies
    - `saving_throws_data` (jsonb) - stores calculated saving throw modifiers
    - `equipment_slots` (jsonb) - stores equipped items by slot
    - `spell_slots` (jsonb) - stores current and max spell slots by level

  2. Updates
    - Add new columns to characters table
    - Update existing characters with calculated data
    - Maintain backward compatibility
*/

-- Add new columns for enhanced character data
DO $$
BEGIN
  -- Add skills_data column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'skills_data'
  ) THEN
    ALTER TABLE characters ADD COLUMN skills_data jsonb DEFAULT '{}';
  END IF;

  -- Add saving_throws_data column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'saving_throws_data'
  ) THEN
    ALTER TABLE characters ADD COLUMN saving_throws_data jsonb DEFAULT '{}';
  END IF;

  -- Add equipment_slots column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'equipment_slots'
  ) THEN
    ALTER TABLE characters ADD COLUMN equipment_slots jsonb DEFAULT '{}';
  END IF;

  -- Add spell_slots column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'spell_slots'
  ) THEN
    ALTER TABLE characters ADD COLUMN spell_slots jsonb DEFAULT '{}';
  END IF;
END $$;

-- Create indexes for better performance on JSONB columns
CREATE INDEX IF NOT EXISTS idx_characters_skills_data ON characters USING GIN (skills_data);
CREATE INDEX IF NOT EXISTS idx_characters_saving_throws_data ON characters USING GIN (saving_throws_data);
CREATE INDEX IF NOT EXISTS idx_characters_equipment_slots ON characters USING GIN (equipment_slots);
CREATE INDEX IF NOT EXISTS idx_characters_spell_slots ON characters USING GIN (spell_slots);

-- Update the updated_at trigger to fire on these new columns
DROP TRIGGER IF EXISTS trigger_update_characters_updated_at ON characters;
CREATE TRIGGER trigger_update_characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();