export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          last_seen: string;
        };
        Insert: {
          id?: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          last_seen?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          last_seen?: string;
        };
      };
      game_sessions: {
        Row: {
          id: string;
          name: string;
          description: string;
          dungeon_master_id: string | null;
          max_players: number;
          current_players: number;
          is_active: boolean;
          is_public: boolean;
          password_hash: string | null;
          current_turn: number;
          turn_phase: 'waiting' | 'collecting' | 'processing' | 'completed';
          turn_deadline: string | null;
          current_scene: string;
          session_settings: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          dungeon_master_id?: string | null;
          max_players?: number;
          current_players?: number;
          is_active?: boolean;
          is_public?: boolean;
          password_hash?: string | null;
          current_turn?: number;
          turn_phase?: 'waiting' | 'collecting' | 'processing' | 'completed';
          turn_deadline?: string | null;
          current_scene?: string;
          session_settings?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          dungeon_master_id?: string | null;
          max_players?: number;
          current_players?: number;
          is_active?: boolean;
          is_public?: boolean;
          password_hash?: string | null;
          current_turn?: number;
          turn_phase?: 'waiting' | 'collecting' | 'processing' | 'completed';
          turn_deadline?: string | null;
          current_scene?: string;
          session_settings?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      session_players: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          character_id: string | null;
          role: 'player' | 'dm' | 'observer';
          is_ready: boolean;
          last_action_time: string | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          character_id?: string | null;
          role?: 'player' | 'dm' | 'observer';
          is_ready?: boolean;
          last_action_time?: string | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          character_id?: string | null;
          role?: 'player' | 'dm' | 'observer';
          is_ready?: boolean;
          last_action_time?: string | null;
          joined_at?: string;
        };
      };
      turn_actions: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          character_id: string | null;
          turn_number: number;
          action_text: string;
          action_type: 'action' | 'reaction' | 'bonus_action' | 'movement';
          is_processed: boolean;
          submitted_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          character_id?: string | null;
          turn_number: number;
          action_text: string;
          action_type?: 'action' | 'reaction' | 'bonus_action' | 'movement';
          is_processed?: boolean;
          submitted_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          character_id?: string | null;
          turn_number?: number;
          action_text?: string;
          action_type?: 'action' | 'reaction' | 'bonus_action' | 'movement';
          is_processed?: boolean;
          submitted_at?: string;
          processed_at?: string | null;
        };
      };
      characters: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          class_id: string;
          level: number;
          stats: any;
          hit_points: number;
          max_hit_points: number;
          armor_class: number;
          proficiency_bonus: number;
          experience: number;
          background: string | null;
          inventory: any;
          spells: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          class_id: string;
          level?: number;
          stats?: any;
          hit_points?: number;
          max_hit_points?: number;
          armor_class?: number;
          proficiency_bonus?: number;
          experience?: number;
          background?: string | null;
          inventory?: any;
          spells?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          class_id?: string;
          level?: number;
          stats?: any;
          hit_points?: number;
          max_hit_points?: number;
          armor_class?: number;
          proficiency_bonus?: number;
          experience?: number;
          background?: string | null;
          inventory?: any;
          spells?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      story_entries: {
        Row: {
          id: string;
          session_id: string | null;
          character_id: string | null;
          user_id: string | null;
          type: string;
          content: string;
          voice_url: string | null;
          timestamp: string;
          turn_number: number | null;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          character_id?: string | null;
          user_id?: string | null;
          type: string;
          content: string;
          voice_url?: string | null;
          timestamp?: string;
          turn_number?: number | null;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          character_id?: string | null;
          user_id?: string | null;
          type?: string;
          content?: string;
          voice_url?: string | null;
          timestamp?: string;
          turn_number?: number | null;
        };
      };
    };
  };
}