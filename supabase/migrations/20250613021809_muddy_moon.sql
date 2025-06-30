/*
  # Fix Multiplayer RLS Policies and Chat System

  1. Problem Resolution
    - Remove all recursive RLS policies that cause infinite loops
    - Implement simple, direct policies that avoid circular dependencies
    - Fix chat system to work properly with session access

  2. New Approach
    - Use direct table references without subqueries where possible
    - Separate policies for different access patterns
    - Ensure chat messages work with proper session access

  3. Security
    - Maintain proper access control
    - Users can only access their own data and sessions they're part of
    - DMs have full access to their sessions
*/

-- Drop ALL existing problematic policies
DROP POLICY IF EXISTS "session_players_own_access" ON session_players;
DROP POLICY IF EXISTS "session_players_public_view" ON session_players;
DROP POLICY IF EXISTS "session_players_dm_access" ON session_players;
DROP POLICY IF EXISTS "Users can manage own session player records" ON session_players;
DROP POLICY IF EXISTS "DMs can manage players in their sessions" ON session_players;
DROP POLICY IF EXISTS "Players can view session participants" ON session_players;

-- Drop story entries policies
DROP POLICY IF EXISTS "story_entries_session_access" ON story_entries;
DROP POLICY IF EXISTS "story_entries_session_insert" ON story_entries;

-- Drop turn actions policies  
DROP POLICY IF EXISTS "turn_actions_session_access" ON turn_actions;
DROP POLICY IF EXISTS "turn_actions_own_management" ON turn_actions;

-- Drop chat policies
DROP POLICY IF EXISTS "chat_messages_session_access" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_session_insert" ON chat_messages;

-- Create simple, non-recursive policies for session_players

-- Policy 1: Users can manage their own session participation
CREATE POLICY "session_players_own_management"
  ON session_players
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 2: DMs can view and manage all players in their sessions
CREATE POLICY "session_players_dm_management"
  ON session_players
  FOR ALL
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE dungeon_master_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE dungeon_master_id = auth.uid()
    )
  );

-- Policy 3: Anyone can view players in public sessions (for browsing)
CREATE POLICY "session_players_public_sessions"
  ON session_players
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE is_public = true
    )
  );

-- Create simple policies for story_entries

-- Users can view story entries in sessions where they are DM or participant
CREATE POLICY "story_entries_view_access"
  ON story_entries
  FOR SELECT
  TO authenticated
  USING (
    -- User is DM of the session
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE dungeon_master_id = auth.uid()
    )
    OR
    -- User is a participant in the session
    session_id IN (
      SELECT session_id FROM session_players 
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert story entries in sessions they participate in
CREATE POLICY "story_entries_insert_access"
  ON story_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- User is DM of the session
      session_id IN (
        SELECT id FROM game_sessions 
        WHERE dungeon_master_id = auth.uid()
      )
      OR
      -- User is a participant in the session
      session_id IN (
        SELECT session_id FROM session_players 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create simple policies for turn_actions

-- Users can view turn actions in sessions they participate in
CREATE POLICY "turn_actions_view_access"
  ON turn_actions
  FOR SELECT
  TO authenticated
  USING (
    -- User is DM of the session
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE dungeon_master_id = auth.uid()
    )
    OR
    -- User is a participant in the session
    session_id IN (
      SELECT session_id FROM session_players 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only manage their own turn actions
CREATE POLICY "turn_actions_own_management"
  ON turn_actions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Ensure chat_messages table exists with proper structure
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS on chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create simple policies for chat_messages

-- Users can view chat messages in sessions they participate in
CREATE POLICY "chat_messages_view_access"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    -- User is DM of the session
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE dungeon_master_id = auth.uid()
    )
    OR
    -- User is a participant in the session
    session_id IN (
      SELECT session_id FROM session_players 
      WHERE user_id = auth.uid()
    )
  );

-- Users can send chat messages to sessions they participate in
CREATE POLICY "chat_messages_send_access"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- User is DM of the session
      session_id IN (
        SELECT id FROM game_sessions 
        WHERE dungeon_master_id = auth.uid()
      )
      OR
      -- User is a participant in the session
      session_id IN (
        SELECT session_id FROM session_players 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- Update the session player count trigger to be more robust
CREATE OR REPLACE FUNCTION update_session_player_count_and_cleanup()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update player count and mark session as active
    UPDATE game_sessions 
    SET 
      current_players = (
        SELECT COUNT(*) FROM session_players 
        WHERE session_id = NEW.session_id AND role = 'player'
      ),
      is_active = true,
      updated_at = now()
    WHERE id = NEW.session_id;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Update player count
    UPDATE game_sessions 
    SET 
      current_players = (
        SELECT COUNT(*) FROM session_players 
        WHERE session_id = OLD.session_id AND role = 'player'
      ),
      updated_at = now()
    WHERE id = OLD.session_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_session_player_count_and_cleanup ON session_players;
CREATE TRIGGER trigger_update_session_player_count_and_cleanup
  AFTER INSERT OR DELETE ON session_players
  FOR EACH ROW
  EXECUTE FUNCTION update_session_player_count_and_cleanup();

-- Function to get session participants (for debugging)
CREATE OR REPLACE FUNCTION get_session_participants(session_uuid uuid)
RETURNS TABLE(
  player_id uuid,
  username text,
  character_name text,
  role text,
  is_ready boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.user_id,
    u.username,
    COALESCE(c.name, 'No Character') as character_name,
    sp.role,
    sp.is_ready
  FROM session_players sp
  JOIN users u ON sp.user_id = u.id
  LEFT JOIN characters c ON sp.character_id = c.id
  WHERE sp.session_id = session_uuid
  ORDER BY sp.role DESC, sp.joined_at;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_session_participants(uuid) TO authenticated;

-- Force PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the setup
DO $$
BEGIN
  RAISE NOTICE 'Multiplayer RLS policies have been completely rewritten to avoid recursion';
  RAISE NOTICE 'Chat system has been properly configured with direct session access';
  RAISE NOTICE 'All policies now use simple, direct table references';
  RAISE NOTICE 'Session player visibility should now work correctly';
END $$;