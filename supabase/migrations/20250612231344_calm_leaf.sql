/*
  # Create chat messages table for multiplayer sessions

  1. New Tables
    - `chat_messages`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references game_sessions)
      - `user_id` (uuid, references users)
      - `message` (text)
      - `timestamp` (timestamptz)

  2. Security
    - Enable RLS on `chat_messages` table
    - Add policies for session participants to manage chat messages

  3. Indexes
    - Add indexes for better query performance
*/

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Session participants can view chat messages
CREATE POLICY "Users can view chat messages in their sessions"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT sp.session_id 
      FROM session_players sp 
      WHERE sp.user_id = auth.uid()
    )
    OR
    session_id IN (
      SELECT gs.id 
      FROM game_sessions gs 
      WHERE gs.dungeon_master_id = auth.uid()
    )
  );

-- Session participants can send chat messages
CREATE POLICY "Users can send chat messages to their sessions"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND (
      session_id IN (
        SELECT sp.session_id 
        FROM session_players sp 
        WHERE sp.user_id = auth.uid()
      )
      OR
      session_id IN (
        SELECT gs.id 
        FROM game_sessions gs 
        WHERE gs.dungeon_master_id = auth.uid()
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);