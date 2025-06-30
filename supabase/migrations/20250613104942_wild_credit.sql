/*
  # Enhanced Session Cleanup and Game Flow System

  1. Automatic Session Cleanup
    - Sessions auto-close when creator leaves and no players remain
    - Cleanup orphaned sessions and data
    - Prevent session pollution

  2. Game Flow Management
    - Clear game start conditions
    - Checkpoint system for game progression
    - Player guidance and instructions

  3. Session Lifecycle
    - Proper session state management
    - Turn-based game progression
    - Clear win/lose conditions
*/

-- Enhanced session cleanup that triggers when creator leaves
CREATE OR REPLACE FUNCTION cleanup_session_on_creator_leave()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  session_record game_sessions;
  remaining_players integer;
BEGIN
  -- Only process if a DM is leaving
  IF OLD.role = 'dm' THEN
    -- Get session info
    SELECT * INTO session_record FROM game_sessions WHERE id = OLD.session_id;
    
    -- Count remaining players (excluding the leaving DM)
    SELECT COUNT(*) INTO remaining_players
    FROM session_players 
    WHERE session_id = OLD.session_id 
    AND role = 'player'
    AND user_id != OLD.user_id;
    
    -- If no players remain, mark session for cleanup
    IF remaining_players = 0 THEN
      -- Mark session as inactive
      UPDATE game_sessions 
      SET 
        is_active = false,
        updated_at = now()
      WHERE id = OLD.session_id;
      
      -- Schedule for deletion after 5 minutes grace period
      -- This allows players to rejoin if they were temporarily disconnected
      INSERT INTO session_cleanup_queue (
        session_id,
        cleanup_after,
        reason
      ) VALUES (
        OLD.session_id,
        now() + interval '5 minutes',
        'Creator left with no remaining players'
      ) ON CONFLICT (session_id) DO UPDATE SET
        cleanup_after = now() + interval '5 minutes',
        reason = 'Creator left with no remaining players';
        
      RAISE NOTICE 'Session % scheduled for cleanup - creator left with no players', OLD.session_id;
    ELSE
      RAISE NOTICE 'Session % has % remaining players, not scheduling cleanup', OLD.session_id, remaining_players;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create cleanup queue table
CREATE TABLE IF NOT EXISTS session_cleanup_queue (
  session_id uuid PRIMARY KEY REFERENCES game_sessions(id) ON DELETE CASCADE,
  cleanup_after timestamptz NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create trigger for automatic cleanup when DM leaves
DROP TRIGGER IF EXISTS trigger_cleanup_on_dm_leave ON session_players;
CREATE TRIGGER trigger_cleanup_on_dm_leave
  AFTER DELETE ON session_players
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_session_on_creator_leave();

-- Function to process cleanup queue
CREATE OR REPLACE FUNCTION process_session_cleanup_queue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_record RECORD;
  cleaned_count integer := 0;
BEGIN
  -- Process sessions ready for cleanup
  FOR cleanup_record IN 
    SELECT scq.session_id, scq.reason, gs.name
    FROM session_cleanup_queue scq
    JOIN game_sessions gs ON scq.session_id = gs.id
    WHERE scq.cleanup_after <= now()
  LOOP
    -- Final check: ensure session still has no active players
    IF NOT EXISTS (
      SELECT 1 FROM session_players sp
      WHERE sp.session_id = cleanup_record.session_id 
      AND sp.role = 'player'
    ) THEN
      -- Clean up the session
      DELETE FROM game_sessions WHERE id = cleanup_record.session_id;
      cleaned_count := cleaned_count + 1;
      
      RAISE NOTICE 'Cleaned up session: % (Reason: %)', 
        cleanup_record.name, cleanup_record.reason;
    ELSE
      -- Session has players again, remove from cleanup queue
      DELETE FROM session_cleanup_queue WHERE session_id = cleanup_record.session_id;
      
      RAISE NOTICE 'Session % has players again, removed from cleanup queue', 
        cleanup_record.name;
    END IF;
  END LOOP;
  
  RETURN cleaned_count;
END;
$$;

-- Enhanced game state management
CREATE TABLE IF NOT EXISTS game_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  checkpoint_name text NOT NULL,
  checkpoint_data jsonb NOT NULL DEFAULT '{}',
  turn_number integer NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Function to create game checkpoint
CREATE OR REPLACE FUNCTION create_game_checkpoint(
  session_uuid uuid,
  checkpoint_name text,
  checkpoint_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid uuid;
  session_record game_sessions;
  checkpoint_id uuid;
BEGIN
  user_uuid := auth.uid();
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify user is DM of the session
  SELECT * INTO session_record FROM game_sessions 
  WHERE id = session_uuid AND dungeon_master_id = user_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only the DM can create checkpoints';
  END IF;
  
  -- Create checkpoint
  INSERT INTO game_checkpoints (
    session_id,
    checkpoint_name,
    checkpoint_data,
    turn_number,
    created_by
  ) VALUES (
    session_uuid,
    checkpoint_name,
    checkpoint_data,
    session_record.current_turn,
    user_uuid
  ) RETURNING id INTO checkpoint_id;
  
  RETURN checkpoint_id;
END;
$$;

-- Function to get game instructions for players
CREATE OR REPLACE FUNCTION get_game_instructions()
RETURNS TABLE(
  section text,
  title text,
  content text,
  order_num integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY VALUES
    ('getting_started', 'How to Start Playing', 
     'To begin your adventure: 1) Create or select a character, 2) Join a public session or create your own, 3) Wait for the DM to start the game, 4) Submit your actions when it''s your turn!', 1),
    
    ('character_creation', 'Creating Your Character', 
     'Choose your character''s class, roll stats, and select a background. Your character''s abilities will determine what actions you can take in the game. Don''t worry - you can create multiple characters!', 2),
    
    ('joining_sessions', 'Joining Game Sessions', 
     'Browse public sessions in the Session Browser. Look for sessions with available slots and interesting descriptions. Click "Join Adventure" to enter with your selected character.', 3),
    
    ('game_flow', 'How the Game Works', 
     'The game is turn-based. When it''s your turn, describe what your character wants to do (e.g., "I search the ancient chest" or "I cast a fireball at the goblin"). The DM will process all actions and advance the story.', 4),
    
    ('dm_role', 'For Dungeon Masters', 
     'As a DM: 1) Create a session with your preferred settings, 2) Wait for players to join, 3) Start the game when everyone is ready, 4) Use "Start Turn" to collect player actions, 5) Use "Process Turn" to advance the story.', 5),
    
    ('turn_system', 'Turn-Based Gameplay', 
     'Each turn has phases: Waiting (DM prepares) → Collecting (players submit actions) → Processing (DM resolves actions) → Completed (story advances). Players have a time limit to submit actions.', 6),
    
    ('chat_system', 'Communication', 
     'Use the chat system to talk with other players out-of-character. For in-character actions, use the action submission system. The DM can see all communications.', 7),
    
    ('winning_losing', 'Victory and Defeat', 
     'Games can end in victory (completing the main quest), defeat (all characters die), or when the DM decides to end the session. Your character''s progress is saved between sessions.', 8);
END;
$$;

-- Function to check if game can start
CREATE OR REPLACE FUNCTION can_start_game(session_uuid uuid)
RETURNS TABLE(
  can_start boolean,
  reason text,
  player_count integer,
  ready_count integer,
  min_players integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record game_sessions;
  player_count_val integer;
  ready_count_val integer;
  min_players_val integer := 2; -- Minimum players to start
BEGIN
  -- Get session info
  SELECT * INTO session_record FROM game_sessions WHERE id = session_uuid;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Session not found', 0, 0, min_players_val;
    RETURN;
  END IF;
  
  -- Count players and ready players
  SELECT 
    COUNT(*) FILTER (WHERE role = 'player'),
    COUNT(*) FILTER (WHERE role = 'player' AND is_ready)
  INTO player_count_val, ready_count_val
  FROM session_players 
  WHERE session_id = session_uuid;
  
  -- Check conditions
  IF player_count_val < min_players_val THEN
    RETURN QUERY SELECT false, 'Need at least ' || min_players_val || ' players', 
                        player_count_val, ready_count_val, min_players_val;
  ELSIF ready_count_val < player_count_val THEN
    RETURN QUERY SELECT false, 'All players must be ready', 
                        player_count_val, ready_count_val, min_players_val;
  ELSIF session_record.turn_phase != 'waiting' THEN
    RETURN QUERY SELECT false, 'Game is already in progress', 
                        player_count_val, ready_count_val, min_players_val;
  ELSE
    RETURN QUERY SELECT true, 'Ready to start!', 
                        player_count_val, ready_count_val, min_players_val;
  END IF;
END;
$$;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION process_session_cleanup_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION create_game_checkpoint(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_game_instructions() TO authenticated;
GRANT EXECUTE ON FUNCTION can_start_game(uuid) TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_cleanup_queue_cleanup_after ON session_cleanup_queue(cleanup_after);
CREATE INDEX IF NOT EXISTS idx_game_checkpoints_session_id ON game_checkpoints(session_id);

-- Enable RLS on new tables
ALTER TABLE session_cleanup_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_checkpoints ENABLE ROW LEVEL SECURITY;

-- RLS policies for cleanup queue (only service functions can access)
CREATE POLICY "cleanup_queue_service_access"
  ON session_cleanup_queue
  FOR ALL
  TO service_role
  USING (true);

-- RLS policies for checkpoints
CREATE POLICY "checkpoints_session_participants"
  ON game_checkpoints
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_players sp 
      WHERE sp.session_id = game_checkpoints.session_id 
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "checkpoints_dm_management"
  ON game_checkpoints
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs 
      WHERE gs.id = game_checkpoints.session_id 
      AND gs.dungeon_master_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions gs 
      WHERE gs.id = game_checkpoints.session_id 
      AND gs.dungeon_master_id = auth.uid()
    )
  );

-- Schedule cleanup processing (this would typically be done via a cron job)
-- For now, we'll run it manually when needed

-- Force PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');

DO $$
BEGIN
  RAISE NOTICE 'Session cleanup system implemented';
  RAISE NOTICE 'Automatic cleanup when creator leaves with no players';
  RAISE NOTICE 'Game checkpoint system added';
  RAISE NOTICE 'Player instruction system created';
  RAISE NOTICE 'Game start validation implemented';
END $$;