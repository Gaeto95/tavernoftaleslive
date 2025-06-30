import { CharacterModel } from './character';

export interface MultiplayerSession {
  id: string;
  name: string;
  description: string;
  hostId: string;
  players: number;
  maxPlayers: number;
  status: 'waiting' | 'active' | 'completed';
  createdAt: number;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  character: CharacterModel | null;
}

export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
}