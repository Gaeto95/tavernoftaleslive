/*
  # Multiplayer Game System

  1. New Tables
    - `users` - User authentication and profiles
    - `game_sessions` - Multiplayer game sessions
    - `session_players` - Players in each session
    - `turn_actions` - Player actions for each turn
    - `turn_state` - Current turn state management
    - `characters` - Player characters (updated)
    - `story_entries` - Story history (updated)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Session-based access control

  3. Real-time Features
    - Turn management
    - Action submission
    - Story synchronization
*/

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Game Sessions table (updated)
DROP TABLE IF EXISTS game_sessions CASCADE;
CREATE TABLE game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  dungeon_master_id uuid REFERENCES users(id) ON DELETE CASCADE,
  max_players integer DEFAULT 6,
  current_players integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_public boolean DEFAULT true,
  password_hash text,
  current_turn integer DEFAULT 1,
  turn_phase text DEFAULT 'waiting' CHECK (turn_phase IN ('waiting', 'collecting', 'processing', 'completed')),
  turn_deadline timestamptz,
  current_scene text DEFAULT '',
  session_settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public sessions"
  ON game_sessions
  FOR SELECT
  TO authenticated
  USING (is_public = true OR dungeon_master_id = auth.uid());

CREATE POLICY "DMs can manage their sessions"
  ON game_sessions
  FOR ALL
  TO authenticated
  USING (dungeon_master_id = auth.uid())
  WITH CHECK (dungeon_master_id = auth.uid());

-- Session Players junction table
CREATE TABLE IF NOT EXISTS session_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  character_id uuid,
  role text DEFAULT 'player' CHECK (role IN ('player', 'dm', 'observer')),
  is_ready boolean DEFAULT false,
  last_action_time timestamptz,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can view session players"
  ON session_players
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM session_players sp2 
      WHERE sp2.session_id = session_players.session_id 
      AND sp2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join sessions"
  ON session_players
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their session status"
  ON session_players
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Turn Actions table
CREATE TABLE IF NOT EXISTS turn_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  character_id uuid,
  turn_number integer NOT NULL,
  action_text text NOT NULL,
  action_type text DEFAULT 'action' CHECK (action_type IN ('action', 'reaction', 'bonus_action', 'movement')),
  is_processed boolean DEFAULT false,
  submitted_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  UNIQUE(session_id, user_id, turn_number)
);

ALTER TABLE turn_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can view turn actions"
  ON turn_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_players sp 
      WHERE sp.session_id = turn_actions.session_id 
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can submit their own actions"
  ON turn_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own unprocessed actions"
  ON turn_actions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND is_processed = false);

-- Characters table (updated with user relationship)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE characters ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update characters policies
DROP POLICY IF EXISTS "Users can manage their own characters" ON characters;

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
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM session_players sp 
      WHERE sp.character_id = characters.id 
      AND EXISTS (
        SELECT 1 FROM session_players sp2 
        WHERE sp2.session_id = sp.session_id 
        AND sp2.user_id = auth.uid()
      )
    )
  );

-- Story Entries table (updated)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_entries' AND column_name = 'turn_number'
  ) THEN
    ALTER TABLE story_entries ADD COLUMN turn_number integer;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_entries' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE story_entries ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update story entries policies
DROP POLICY IF EXISTS "Session participants can manage story entries" ON story_entries;

CREATE POLICY "Session participants can view story entries"
  ON story_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_players sp 
      WHERE sp.session_id = story_entries.session_id 
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Session participants can add story entries"
  ON story_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM session_players sp 
      WHERE sp.session_id = story_entries.session_id 
      AND sp.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_active ON game_sessions(is_active, is_public);
CREATE INDEX IF NOT EXISTS idx_session_players_session ON session_players(session_id);
CREATE INDEX IF NOT EXISTS idx_turn_actions_session_turn ON turn_actions(session_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_story_entries_session_turn ON story_entries(session_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);

-- Functions for turn management
CREATE OR REPLACE FUNCTION advance_turn(session_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE game_sessions 
  SET 
    current_turn = current_turn + 1,
    turn_phase = 'waiting',
    turn_deadline = NULL,
    updated_at = now()
  WHERE id = session_uuid;
  
  -- Reset player ready states
  UPDATE session_players 
  SET is_ready = false 
  WHERE session_id = session_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION start_turn_collection(session_uuid uuid, deadline_minutes integer DEFAULT 5)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE game_sessions 
  SET 
    turn_phase = 'collecting',
    turn_deadline = now() + (deadline_minutes || ' minutes')::interval,
    updated_at = now()
  WHERE id = session_uuid;
END;
$$;

-- Trigger to update session player count
CREATE OR REPLACE FUNCTION update_session_player_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE game_sessions 
    SET current_players = current_players + 1 
    WHERE id = NEW.session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE game_sessions 
    SET current_players = current_players - 1 
    WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_session_player_count ON session_players;
CREATE TRIGGER trigger_update_session_player_count
  AFTER INSERT OR DELETE ON session_players
  FOR EACH ROW
  EXECUTE FUNCTION update_session_player_count();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON users;
CREATE TRIGGER trigger_update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_game_sessions_updated_at ON game_sessions;
CREATE TRIGGER trigger_update_game_sessions_updated_at
  BEFORE UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_characters_updated_at ON characters;
CREATE TRIGGER trigger_update_characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();