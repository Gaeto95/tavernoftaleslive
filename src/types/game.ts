import { EquipmentSlots } from './character';

export interface GameState {
  level: number;
  xp: number;
  maxXp: number;
  inventory: InventoryItem[];
  storyHistory: StoryEntry[];
  currentScene: string;
  sessionId: string;
  isLoading: boolean;
  autoPlayVoice: boolean;
  hasLeveledUp: boolean;
  isDead: boolean;
  hasWon: boolean;
  deathSaves: {
    successes: number;
    failures: number;
  };
  inspiration: boolean;
  questProgress: QuestProgress[];
  gameStats: GameStats;
  // Map and exploration data
  map: MapRoom[];
  exploredAreas: string[];
  currentLocation: string;
  // Story progression tracking
  storyProgress: {
    currentAct: number;
    totalActs: number;
    isClimaxNear: boolean;
    isEndingNear: boolean;
    isComplete?: boolean;
  };
  // New features
  storyPreset: StoryPreset | null;
  worldMemory: WorldMemory;
  companions: Companion[];
  storyCards: StoryCard[];
  activeStoryCard: StoryCard | null;
  diceRollPending: boolean;
  chaosDiceAvailable: boolean;
  lastChaosDiceResult: number | null;
  // Side quests
  sideQuests?: SideQuest[];
}

export interface GameStats {
  totalDamageDealt: number;
  totalDamageTaken: number;
  enemiesDefeated: number;
  treasuresFound: number;
  puzzlesSolved: number;
  criticalHits: number;
  criticalFails: number;
  totalPlayTime: number;
  startTime: number;
}

export interface QuestProgress {
  id: string;
  name: string;
  description: string;
  isCompleted: boolean;
  isMainQuest: boolean;
  progress: number;
  maxProgress: number;
  // Enhanced quest tracking with milestones
  milestones: QuestMilestone[];
  // Current active milestone index
  currentMilestoneIndex: number;
  rewards: {
    xp: number;
    items?: InventoryItem[];
    gold?: number;
  };
}

// New interface for quest milestones
export interface QuestMilestone {
  id: string;
  description: string;
  isCompleted: boolean;
  location?: string; // Optional location where this milestone takes place
  requiredItems?: string[]; // Optional items needed to complete this milestone
  completionHint?: string; // Optional hint for how to complete this milestone
}

export interface SideQuest {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  reward: string;
  relatedTo?: string; // NPC or location this is related to
  isCompleted: boolean;
  progress: number;
  maxProgress: number;
  // Enhanced side quest tracking with milestones
  milestones?: QuestMilestone[];
  currentMilestoneIndex?: number;
  createdAt: number;
  completedAt?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  lore?: string; // Added item lore field
  type: 'weapon' | 'armor' | 'potion' | 'tool' | 'treasure' | 'spell_component';
  quantity?: number;
  usable?: boolean;
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact';
  value?: number;
  properties?: string[];
  damage?: string;
  armorClass?: number;
  magicalProperties?: string[];
  isEquippable?: boolean;
  equipmentSlot?: keyof EquipmentSlots;
  isEquipped?: boolean;
}

export interface StoryEntry {
  id: string;
  type: 'player' | 'dm' | 'system' | 'death_save' | 'level_up' | 'quest_complete' | 'story_card';
  content: string;
  timestamp: number;
  voiceUrl?: string;
  isPlaying?: boolean;
  diceRolls?: DiceRoll[];
  damageDealt?: number;
  damageTaken?: number;
  storyCardId?: string; // Reference to a story card if this entry was triggered by one
}

export interface DiceRoll {
  type: string; // e.g., "d20", "d6", "attack", "damage", "saving_throw"
  result: number;
  modifier: number;
  total: number;
  isCritical?: boolean;
  advantage?: boolean;
  disadvantage?: boolean;
  purpose: string; // e.g., "Attack Roll", "Damage", "Constitution Save"
}

export interface APIConfig {
  openaiKey: string;
  elevenlabsKey: string;
}

export interface GameAction {
  type: 'SET_LOADING' | 'ADD_STORY_ENTRY' | 'UPDATE_PLAYER_STATS' | 'UPDATE_INVENTORY' | 
        'ADD_ITEM' | 'REMOVE_ITEM' | 'USE_ITEM' | 'SET_SCENE' | 'TOGGLE_VOICE' | 
        'TOGGLE_AUTO_PLAY' | 'LOAD_SAVED_STATE' | 'RESET_GAME' | 'CLEAR_LEVEL_UP' | 
        'SET_DEATH' | 'SET_WIN' | 'DEATH_SAVE' | 'REVIVE' | 'ADD_QUEST' | 'UPDATE_QUEST' | 
        'COMPLETE_QUEST' | 'GRANT_INSPIRATION' | 'USE_INSPIRATION' | 'UPDATE_STATS' | 
        'REVEAL_AREA' | 'UPDATE_LOCATION' | 'MARK_ROOM_COMPLETED' | 'UPDATE_STORY_PROGRESS' | 
        'COMPLETE_STORY' | 'SET_STORY_HISTORY' |
        // New action types
        'SET_STORY_PRESET' | 'UPDATE_WORLD_MEMORY' | 'ADD_COMPANION' | 'UPDATE_COMPANION' | 
        'REMOVE_COMPANION' | 'DRAW_STORY_CARD' | 'DISCARD_STORY_CARD' | 'SET_DICE_ROLL_PENDING' | 
        'ROLL_CHAOS_DICE' | 'SET_CHAOS_DICE_AVAILABLE' |
        // Side quest actions
        'ADD_SIDE_QUEST' | 'UPDATE_SIDE_QUEST' | 'COMPLETE_SIDE_QUEST' |
        // Quest milestone actions
        'COMPLETE_QUEST_MILESTONE' | 'UPDATE_CURRENT_MILESTONE';
  payload?: any;
}

// Map-related interfaces
export interface MapRoom {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  type: 'entrance' | 'chamber' | 'corridor' | 'treasure' | 'boss' | 'exit' | 'secret';
  connections: string[]; // Array of connected room IDs
  hasEnemies?: boolean;
  hasTreasure?: boolean;
  isCompleted?: boolean;
}

export interface MapConnection {
  from: string;
  to: string;
  direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
  isHidden?: boolean;
}

// New interfaces for core features

export interface StoryPreset {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  initialStory: string;
  imagePrompt: string;
  suggestedActions: string[];
  tags: string[];
}

export interface WorldMemory {
  exploredLocations: {
    [locationId: string]: {
      visitCount: number;
      lastVisitTimestamp: number;
      notes: string;
    }
  };
  knownNPCs: {
    [npcId: string]: {
      name: string;
      description: string;
      attitude: 'friendly' | 'neutral' | 'hostile';
      lastInteraction: string;
      location: string;
      isAlive: boolean;
      personalityTrait?: string; // Added personality trait
      sampleDialogue?: string;   // Added sample dialogue
      importance?: number;       // Added importance (1-10)
    }
  };
  playerDecisions: {
    id: string;
    decision: string;
    consequence: string;
    timestamp: number;
  }[];
  worldState: {
    [key: string]: any;
  };
  persistentFlags: {
    [key: string]: boolean;
  };
}

export interface Companion {
  id: string;
  name: string;
  description: string;
  personality: string;
  loyalty: number; // 0-100
  skills: string[];
  backstory: string;
  relationship: 'loyal' | 'neutral' | 'suspicious' | 'hostile';
  joinedAt: number;
  lastInteraction: string;
  memories: {
    id: string;
    content: string;
    importance: number; // 1-10
    timestamp: number;
  }[];
}

export interface StoryCard {
  id: string;
  name: string;
  type: 'event' | 'character' | 'item' | 'location' | 'twist';
  description: string;
  effect: string;
  imagePrompt?: string;
  imageUrl?: string;
  isRevealed: boolean;
  drawnAt?: number;
}

export interface LegendEntry {
  id: string;
  playerName: string;
  characterName: string;
  characterClass: string;
  level: number;
  title: string;
  summary: string;
  imageUrl?: string;
  achievements: string[];
  completedAt: number;
}

// New interfaces for enhanced AI responses
export interface NPCReaction {
  name: string;
  attitude_change?: 'friendly' | 'neutral' | 'hostile';
  information_gained?: string;
  relationship_change?: string;
  dialogue?: string;
}

export interface PuzzleSolvedStatus {
  is_solved: boolean;
  solution_details?: string;
  reward?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface CombatSummary {
  enemies_defeated: string[];
  player_status: 'victorious' | 'injured' | 'defeated' | 'fled';
  damage_dealt: number;
  damage_taken: number;
  critical_hits?: number;
  loot_gained?: string[];
}

export interface SkillCheckOutcome {
  skill: string;
  success: boolean;
  difficulty: number; // DC value
  roll_value?: number;
  narrative_effect: string;
}

// New interface for random story events
export interface StoryEvent {
  id: string;
  type: 'weather-change' | 'mysterious-stranger' | 'unexpected-discovery' | 
        'gaeto-omen' | 'companion-opportunity' | 'magical-phenomenon';
  description: string;
  effect: string;
  timestamp: number;
}