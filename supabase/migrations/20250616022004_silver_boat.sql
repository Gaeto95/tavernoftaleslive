/*
  # Database Optimization - Adding Indexes

  1. Performance Indexes
     - Added indexes for frequently queried columns
     - Created composite indexes for common query patterns
     - Added GIN indexes for JSON fields

  2. Query Optimization
     - Optimized session filtering and sorting
     - Improved chat message retrieval
     - Enhanced turn action processing
     - Accelerated character lookups
*/

-- Add index for public/active sessions filtering (commonly used in session browser)
CREATE INDEX IF NOT EXISTS idx_game_sessions_public_active ON game_sessions (is_public, is_active);

-- Add index for session creation date (used for sorting in session browser)
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions (created_at);

-- Add index for session updated date (used for "last activity" filtering)
CREATE INDEX IF NOT EXISTS idx_game_sessions_updated_at ON game_sessions (updated_at);

-- Add composite index for chat messages by session with timestamp ordering
-- Note: Using the correct table name from the schema
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_timestamp ON chat_messages (session_id, "timestamp");

-- Add index for chat messages by user (for user message history)
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages (user_id);

-- Add composite index for turn actions by session and turn number (for turn processing)
CREATE INDEX IF NOT EXISTS idx_turn_actions_session_turn ON turn_actions (session_id, turn_number);

-- Add index for processed status (for finding unprocessed actions)
CREATE INDEX IF NOT EXISTS idx_turn_actions_processed ON turn_actions (is_processed);

-- Add index for story entries by turn number (for turn history)
CREATE INDEX IF NOT EXISTS idx_story_entries_turn_number ON story_entries (turn_number);

-- Add index for session players by character (for character session lookup)
CREATE INDEX IF NOT EXISTS idx_session_players_character_id ON session_players (character_id);

-- Add index for session players by user and role (for filtering player types)
CREATE INDEX IF NOT EXISTS idx_session_players_user_role ON session_players (user_id, role);

-- Add index for ready status (for counting ready players)
CREATE INDEX IF NOT EXISTS idx_session_players_ready ON session_players (is_ready);

-- Add index for last action time (for timeout detection)
CREATE INDEX IF NOT EXISTS idx_session_players_last_action ON session_players (last_action_time);

-- Add index for character active session (to quickly find which session a character is in)
CREATE INDEX IF NOT EXISTS idx_characters_active_session ON characters (active_session_id);

-- Add index for character user (to find all characters for a user)
CREATE INDEX IF NOT EXISTS idx_characters_user ON characters (user_id);

-- Add index for character updated time (for sorting by recently used)
CREATE INDEX IF NOT EXISTS idx_characters_updated_at ON characters (updated_at);

-- Add index for character appearance (for appearance lookups)
CREATE INDEX IF NOT EXISTS idx_characters_appearance_id ON characters (appearance_id);

-- Add GIN indexes for JSON fields to enable efficient querying of nested data
CREATE INDEX IF NOT EXISTS idx_characters_stats ON characters USING gin (stats);
CREATE INDEX IF NOT EXISTS idx_characters_inventory ON characters USING gin (inventory);
CREATE INDEX IF NOT EXISTS idx_characters_spells ON characters USING gin (spells);
CREATE INDEX IF NOT EXISTS idx_characters_skills_data ON characters USING gin (skills_data);
CREATE INDEX IF NOT EXISTS idx_characters_saving_throws_data ON characters USING gin (saving_throws_data);
CREATE INDEX IF NOT EXISTS idx_characters_equipment_slots ON characters USING gin (equipment_slots);
CREATE INDEX IF NOT EXISTS idx_characters_spell_slots ON characters USING gin (spell_slots);

-- Add index for game sessions by host (for host's session management)
CREATE INDEX IF NOT EXISTS idx_game_sessions_host ON game_sessions (host_id);

-- Add index for game sessions by turn phase (for filtering by game state)
CREATE INDEX IF NOT EXISTS idx_game_sessions_turn_phase ON game_sessions (turn_phase);

-- Add index for game sessions with passwords (for filtering secure sessions)
CREATE INDEX IF NOT EXISTS idx_game_sessions_has_password ON game_sessions ((password_hash IS NOT NULL));

-- Add index for session settings (for filtering by game mode)
CREATE INDEX IF NOT EXISTS idx_game_sessions_settings ON game_sessions USING gin (session_settings);