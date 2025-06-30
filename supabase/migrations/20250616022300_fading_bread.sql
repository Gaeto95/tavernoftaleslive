/*
# Fix chat_messages table schema

1. New Columns
  - Add `character_id` column to chat_messages table

2. Foreign Keys
  - Add foreign key constraint from chat_messages.character_id to characters.id

3. Indexes
  - Add indexes for chat_messages table for better query performance
*/

-- First, add the character_id column to chat_messages table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'character_id'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN character_id uuid REFERENCES characters(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes for chat_messages table
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_timestamp ON chat_messages (session_id, "timestamp");
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages (session_id, "timestamp");

-- Add index for character_id column
CREATE INDEX IF NOT EXISTS idx_chat_messages_character_id ON chat_messages (character_id);