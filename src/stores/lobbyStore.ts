import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { GameSession } from '../types/multiplayer';
import { CharacterAppearance } from '../types/character3d';

interface LobbyPlayer {
  user_id: string;
  name: string;
  position: [number, number, number];
  appearance: CharacterAppearance;
}

interface LobbyState {
  sessions: GameSession[];
  players: LobbyPlayer[];
  loading: boolean;
  error: string | null;
  loadSessions: () => Promise<void>;
  addPlayer: (player: LobbyPlayer) => void;
  removePlayer: (userId: string) => void;
  updatePlayerPosition: (userId: string, position: [number, number, number]) => void;
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  sessions: [],
  players: [],
  loading: false,
  error: null,
  
  loadSessions: async () => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select(`
          *,
          host:users!host_id(*)
        `)
        .eq('is_public', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      set({ sessions: data || [], loading: false });
    } catch (err) {
      console.error('Error loading sessions:', err);
      set({ 
        error: err instanceof Error ? err.message : 'Failed to load sessions',
        loading: false
      });
    }
  },
  
  addPlayer: (player) => {
    set((state) => {
      // Check if player already exists
      const existingPlayerIndex = state.players.findIndex(p => p.user_id === player.user_id);
      
      if (existingPlayerIndex >= 0) {
        // Update existing player
        const updatedPlayers = [...state.players];
        updatedPlayers[existingPlayerIndex] = player;
        return { players: updatedPlayers };
      } else {
        // Add new player
        return { players: [...state.players, player] };
      }
    });
  },
  
  removePlayer: (userId) => {
    set((state) => ({
      players: state.players.filter(player => player.user_id !== userId)
    }));
  },
  
  updatePlayerPosition: (userId, position) => {
    set((state) => {
      const playerIndex = state.players.findIndex(p => p.user_id === userId);
      
      if (playerIndex >= 0) {
        const updatedPlayers = [...state.players];
        updatedPlayers[playerIndex] = {
          ...updatedPlayers[playerIndex],
          position
        };
        return { players: updatedPlayers };
      }
      
      return state;
    });
  }
}));