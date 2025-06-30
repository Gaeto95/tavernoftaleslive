-- Function to delete a user and all their data
CREATE OR REPLACE FUNCTION delete_user_and_data(user_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Delete user's characters
  DELETE FROM characters WHERE user_id = user_uuid;
  
  -- Remove user from all sessions
  DELETE FROM session_players WHERE user_id = user_uuid;
  
  -- Delete user's chat messages
  DELETE FROM chat_messages WHERE user_id = user_uuid;
  
  -- Delete user's turn actions
  DELETE FROM turn_actions WHERE user_id = user_uuid;
  
  -- Delete user's story entries
  DELETE FROM story_entries WHERE user_id = user_uuid;
  
  -- Remove admin status if applicable
  DELETE FROM admin_users WHERE user_id = user_uuid;
  
  -- Delete user profile
  DELETE FROM users WHERE id = user_uuid;
  
  -- Note: This doesn't delete the auth.users entry - that would require admin API access
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to force end a session
CREATE OR REPLACE FUNCTION force_end_session(session_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Remove all players from the session
  DELETE FROM session_players WHERE session_id = session_uuid;
  
  -- Mark session as inactive
  UPDATE game_sessions
  SET is_active = false
  WHERE id = session_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to change session phase
CREATE OR REPLACE FUNCTION change_session_phase(session_uuid uuid, new_phase text)
RETURNS void AS $$
BEGIN
  -- Validate phase
  IF new_phase NOT IN ('waiting', 'collecting', 'processing', 'completed') THEN
    RAISE EXCEPTION 'Invalid phase: %', new_phase;
  END IF;
  
  -- Update session phase
  UPDATE game_sessions
  SET turn_phase = new_phase
  WHERE id = session_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset session turn
CREATE OR REPLACE FUNCTION reset_session_turn(session_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Delete all unprocessed actions for the current turn
  DELETE FROM turn_actions
  WHERE session_id = session_uuid
  AND is_processed = false;
  
  -- Reset turn phase to waiting
  UPDATE game_sessions
  SET turn_phase = 'waiting'
  WHERE id = session_uuid;
  
  -- Reset player ready status
  UPDATE session_players
  SET is_ready = false
  WHERE session_id = session_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset character stats
CREATE OR REPLACE FUNCTION reset_character_stats(character_uuid uuid)
RETURNS void AS $$
DECLARE
  char_class_id text;
BEGIN
  -- Get character class
  SELECT class_id INTO char_class_id
  FROM characters
  WHERE id = character_uuid;
  
  -- Reset character to level 1
  UPDATE characters
  SET 
    level = 1,
    experience = 0,
    hit_points = CASE
      WHEN char_class_id = 'barbarian' THEN 12
      WHEN char_class_id = 'fighter' THEN 10
      WHEN char_class_id = 'cleric' THEN 8
      WHEN char_class_id = 'rogue' THEN 8
      WHEN char_class_id = 'wizard' THEN 6
      ELSE 8
    END,
    max_hit_points = CASE
      WHEN char_class_id = 'barbarian' THEN 12
      WHEN char_class_id = 'fighter' THEN 10
      WHEN char_class_id = 'cleric' THEN 8
      WHEN char_class_id = 'rogue' THEN 8
      WHEN char_class_id = 'wizard' THEN 6
      ELSE 8
    END,
    armor_class = 10,
    proficiency_bonus = 2,
    inventory = '[]'::jsonb,
    spells = '[]'::jsonb,
    equipment_slots = '{}'::jsonb,
    spell_slots = '{}'::jsonb
  WHERE id = character_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;