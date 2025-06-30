import { useState, useReducer, useCallback, useEffect } from 'react';
import { GameState, StoryEntry, QuestProgress, QuestMilestone, MapRoom, StoryPreset, StoryCard, Companion, SideQuest } from '../types/game';
import { getStoryPresetById } from '../data/storyPresets';
import { getRandomStoryCard, getRandomStoryCardByType } from '../data/storyCards';
import { generateDungeonMap } from '../utils/mapGenerator';
import { DiceRoller } from '../utils/diceRoller';
import { playQuestSound, playCharacterSound } from '../utils/soundEffects';

// Quest name generators for different story presets
const questNameGenerators = {
  'historical-rome': () => {
    const romanPrefixes = ['Imperial', 'Senatorial', 'Legionary', 'Patrician', 'Gladiatorial', 'Centurion\'s', 'Praetorian', 'Consul\'s'];
    const romanNouns = ['Mandate', 'Conquest', 'Conspiracy', 'Glory', 'Triumph', 'Legacy', 'Decree', 'Intrigue', 'Rebellion'];
    return `${romanPrefixes[Math.floor(Math.random() * romanPrefixes.length)]} ${romanNouns[Math.floor(Math.random() * romanNouns.length)]}`;
  },
  'fantasy-adventure': () => {
    const fantasyPrefixes = ['Ancient', 'Mystic', 'Forgotten', 'Enchanted', 'Dragon\'s', 'Elven', 'Dwarven', 'Arcane'];
    const fantasyNouns = ['Prophecy', 'Artifact', 'Kingdom', 'Destiny', 'Reckoning', 'Awakening', 'Quest', 'Legacy'];
    return `The ${fantasyPrefixes[Math.floor(Math.random() * fantasyPrefixes.length)]} ${fantasyNouns[Math.floor(Math.random() * fantasyNouns.length)]}`;
  },
  'fantasy-hobbit': () => {
    const hobbitPrefixes = ['Unexpected', 'Humble', 'Halfling\'s', 'Shire', 'Homely', 'Quiet', 'Perilous', 'Unlikely'];
    const hobbitNouns = ['Journey', 'Adventure', 'Expedition', 'Tale', 'Treasure', 'Fellowship', 'Errand', 'Burden'];
    return `An ${hobbitPrefixes[Math.floor(Math.random() * hobbitPrefixes.length)]} ${hobbitNouns[Math.floor(Math.random() * hobbitNouns.length)]}`;
  },
  'sci-fi-exploration': () => {
    const scifiPrefixes = ['Interstellar', 'Quantum', 'Galactic', 'Cosmic', 'Stellar', 'Void', 'Nebula', 'Astral'];
    const scifiNouns = ['Protocol', 'Expedition', 'Discovery', 'Anomaly', 'Frontier', 'Directive', 'Horizon', 'Convergence'];
    return `${scifiPrefixes[Math.floor(Math.random() * scifiPrefixes.length)]} ${scifiNouns[Math.floor(Math.random() * scifiNouns.length)]}`;
  },
  'cyberpunk-noir': () => {
    const cyberpunkPrefixes = ['Neural', 'Chrome', 'Digital', 'Neon', 'Synthetic', 'Cyber', 'Glitch', 'Darknet'];
    const cyberpunkNouns = ['Protocol', 'Heist', 'Extraction', 'Convergence', 'Syndicate', 'Uprising', 'Blackout', 'Infiltration'];
    return `${cyberpunkPrefixes[Math.floor(Math.random() * cyberpunkPrefixes.length)]} ${cyberpunkNouns[Math.floor(Math.random() * cyberpunkNouns.length)]}`;
  },
  'horror-mansion': () => {
    const horrorPrefixes = ['Haunted', 'Cursed', 'Forbidden', 'Eldritch', 'Macabre', 'Sinister', 'Occult', 'Malevolent'];
    const horrorNouns = ['Legacy', 'Inheritance', 'Ritual', 'Summoning', 'Awakening', 'Presence', 'Manifestation', 'Revelation'];
    return `The ${horrorPrefixes[Math.floor(Math.random() * horrorPrefixes.length)]} ${horrorNouns[Math.floor(Math.random() * horrorNouns.length)]}`;
  },
  'pirate-adventure': () => {
    const piratePrefixes = ['Cursed', 'Lost', 'Sunken', 'Forbidden', 'Captain\'s', 'Kraken\'s', 'Buccaneer\'s', 'Mariner\'s'];
    const pirateNouns = ['Treasure', 'Bounty', 'Voyage', 'Mutiny', 'Revenge', 'Horizon', 'Plunder', 'Legacy'];
    return `The ${piratePrefixes[Math.floor(Math.random() * piratePrefixes.length)]} ${pirateNouns[Math.floor(Math.random() * pirateNouns.length)]}`;
  },
  'wild-west': () => {
    const westernPrefixes = ['Outlaw\'s', 'Frontier', 'Lawman\'s', 'Desperado\'s', 'Ranger\'s', 'Gunslinger\'s', 'Bandit\'s', 'Sheriff\'s'];
    const westernNouns = ['Redemption', 'Justice', 'Vengeance', 'Legacy', 'Bounty', 'Reckoning', 'Code', 'Stand'];
    return `${westernPrefixes[Math.floor(Math.random() * westernPrefixes.length)]} ${westernNouns[Math.floor(Math.random() * westernNouns.length)]}`;
  },
  'mythic-journey': () => {
    const mythicPrefixes = ['Divine', 'Olympian', 'Heroic', 'Legendary', 'Titanic', 'Immortal', 'Fated', 'Prophetic'];
    const mythicNouns = ['Odyssey', 'Trials', 'Labors', 'Destiny', 'Ascension', 'Legacy', 'Voyage', 'Conquest'];
    return `The ${mythicPrefixes[Math.floor(Math.random() * mythicPrefixes.length)]} ${mythicNouns[Math.floor(Math.random() * mythicNouns.length)]}`;
  },
  'warhammer-40k': () => {
    const warhammerPrefixes = ['Imperial', 'Chaotic', 'Heretical', 'Inquisitorial', 'Xenos', 'Mechanicus', 'Astartes', 'Warp'];
    const warhammerNouns = ['Crusade', 'Purge', 'Heresy', 'Incursion', 'Extermination', 'Reckoning', 'Judgment', 'Corruption'];
    return `The ${warhammerPrefixes[Math.floor(Math.random() * warhammerPrefixes.length)]} ${warhammerNouns[Math.floor(Math.random() * warhammerNouns.length)]}`;
  }
};

// Default quest name generator for any preset not specifically defined
const defaultQuestNameGenerator = () => {
  const prefixes = ['Epic', 'Legendary', 'Mysterious', 'Ancient', 'Forgotten', 'Hidden', 'Secret', 'Grand'];
  const nouns = ['Quest', 'Journey', 'Adventure', 'Tale', 'Saga', 'Mission', 'Expedition', 'Voyage'];
  return `The ${prefixes[Math.floor(Math.random() * prefixes.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
};

// Generate a quest name based on the story preset
const generateQuestName = (presetId: string | undefined) => {
  if (!presetId) return defaultQuestNameGenerator();
  
  const generator = questNameGenerators[presetId as keyof typeof questNameGenerators];
  return generator ? generator() : defaultQuestNameGenerator();
};

// Initial game state
const initialState: GameState = {
  level: 1,
  xp: 0,
  maxXp: 1000,
  inventory: [],
  storyHistory: [],
  currentScene: '',
  sessionId: crypto.randomUUID(),
  isLoading: false,
  autoPlayVoice: true,
  hasLeveledUp: false,
  isDead: false,
  hasWon: false,
  deathSaves: {
    successes: 0,
    failures: 0
  },
  inspiration: false,
  questProgress: [
    {
      id: 'main-quest-1',
      name: 'The Epic Quest', // This will be dynamically generated
      description: 'Your first adventure awaits. Discover what lies ahead and prove your worth.',
      isCompleted: false,
      isMainQuest: true,
      progress: 0,
      maxProgress: 100,
      milestones: [
        {
          id: 'milestone-1',
          description: 'Begin your adventure and discover your purpose',
          isCompleted: false
        },
        {
          id: 'milestone-2',
          description: 'Find the first clue to your quest',
          isCompleted: false,
          completionHint: 'Explore the nearby village and talk to the locals'
        },
        {
          id: 'milestone-3',
          description: 'Overcome your first challenge',
          isCompleted: false
        },
        {
          id: 'milestone-4',
          description: 'Discover the truth behind your quest',
          isCompleted: false
        },
        {
          id: 'milestone-5',
          description: 'Face the final challenge',
          isCompleted: false
        }
      ],
      currentMilestoneIndex: 0,
      rewards: {
        xp: 500,
        items: []
      }
    }
  ],
  gameStats: {
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    enemiesDefeated: 0,
    treasuresFound: 0,
    puzzlesSolved: 0,
    criticalHits: 0,
    criticalFails: 0,
    totalPlayTime: 0,
    startTime: Date.now()
  },
  // Map and exploration data
  map: [],
  exploredAreas: [],
  currentLocation: 'entrance',
  // Story progression tracking
  storyProgress: {
    currentAct: 1,
    totalActs: 3,
    isClimaxNear: false,
    isEndingNear: false
  },
  // New features
  storyPreset: null,
  worldMemory: {
    exploredLocations: {},
    knownNPCs: {},
    playerDecisions: [],
    worldState: {},
    persistentFlags: {}
  },
  companions: [],
  storyCards: [],
  activeStoryCard: null,
  diceRollPending: false,
  chaosDiceAvailable: false,
  lastChaosDiceResult: null,
  // Side quests
  sideQuests: []
};

// Game state reducer
function gameReducer(state: GameState, action: any): GameState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'ADD_STORY_ENTRY':
      return {
        ...state,
        storyHistory: [...state.storyHistory, action.payload]
      };
    
    case 'SET_STORY_HISTORY':
      return {
        ...state,
        storyHistory: action.payload
      };
    
    case 'TOGGLE_VOICE':
      return {
        ...state,
        storyHistory: state.storyHistory.map(entry =>
          entry.id === action.payload.id
            ? { ...entry, isPlaying: action.payload.isPlaying }
            : entry.isPlaying && action.payload.isPlaying
              ? { ...entry, isPlaying: false }
              : entry
        )
      };
    
    case 'TOGGLE_AUTO_PLAY':
      return {
        ...state,
        autoPlayVoice: !state.autoPlayVoice
      };
    
    case 'LOAD_SAVED_STATE':
      return {
        ...action.payload,
        isLoading: false
      };
    
    case 'RESET_GAME':
      return {
        ...initialState,
        sessionId: crypto.randomUUID(),
        gameStats: {
          ...initialState.gameStats,
          startTime: Date.now()
        }
      };
    
    case 'CLEAR_LEVEL_UP':
      return {
        ...state,
        hasLeveledUp: false
      };
    
    case 'SET_DEATH':
      return {
        ...state,
        isDead: action.payload
      };
    
    case 'SET_WIN':
      return {
        ...state,
        hasWon: action.payload
      };
    
    case 'DEATH_SAVE':
      const roll = DiceRoller.roll(20);
      const isCritical = roll === 20;
      const isSuccess = roll >= 10 || isCritical;
      
      // Critical success (20) brings you back to life with 1 HP
      if (isCritical) {
        return {
          ...state,
          isDead: false,
          deathSaves: { successes: 0, failures: 0 }
        };
      }
      
      // Critical failure (1) counts as two failures
      const failureIncrement = roll === 1 ? 2 : isSuccess ? 0 : 1;
      const successIncrement = isSuccess ? 1 : 0;
      
      const newSuccesses = state.deathSaves.successes + successIncrement;
      const newFailures = state.deathSaves.failures + failureIncrement;
      
      // 3 successes = stabilized, 3 failures = dead
      const newIsDead = newFailures >= 3;
      
      return {
        ...state,
        isDead: newIsDead,
        deathSaves: {
          successes: newSuccesses,
          failures: newFailures
        },
        storyHistory: [
          ...state.storyHistory,
          {
            id: `death-save-${Date.now()}`,
            type: 'death_save',
            content: isCritical
              ? '✨ Critical success! You regain consciousness with 1 hit point.'
              : isSuccess
                ? `Success! (${roll}) You're one step closer to stabilizing. (${newSuccesses}/3)`
                : roll === 1
                  ? `Critical failure! (${roll}) You suffer two death save failures. (${newFailures}/3)`
                  : `Failure! (${roll}) You're one step closer to death. (${newFailures}/3)`,
            timestamp: Date.now(),
            diceRolls: [{
              type: 'death_save',
              result: roll,
              modifier: 0,
              total: roll,
              isCritical: isCritical || roll === 1,
              purpose: 'Death Save'
            }]
          }
        ]
      };
    
    case 'REVIVE':
      return {
        ...state,
        isDead: false,
        deathSaves: { successes: 0, failures: 0 }
      };
    
    case 'ADD_QUEST':
      return {
        ...state,
        questProgress: [...state.questProgress, action.payload]
      };
    
    case 'UPDATE_QUEST':
      return {
        ...state,
        questProgress: state.questProgress.map(quest => {
          if (quest.id === action.payload.id) {
            // If a milestone is completed
            if (action.payload.completedMilestoneId) {
              const updatedMilestones = quest.milestones.map(milestone => 
                milestone.id === action.payload.completedMilestoneId
                  ? { ...milestone, isCompleted: true }
                  : milestone
              );
              
              // Count completed milestones
              const completedMilestonesCount = updatedMilestones.filter(m => m.isCompleted).length;
              
              // Calculate progress based on completed milestones
              const calculatedProgress = Math.round((completedMilestonesCount / updatedMilestones.length) * quest.maxProgress);
              
              // Find the next incomplete milestone
              let nextMilestoneIndex = quest.currentMilestoneIndex;
              for (let i = 0; i < updatedMilestones.length; i++) {
                if (!updatedMilestones[i].isCompleted) {
                  nextMilestoneIndex = i;
                  break;
                }
              }
              
              // Check if all milestones are completed
              const allMilestonesCompleted = completedMilestonesCount === updatedMilestones.length;
              
              return {
                ...quest,
                progress: calculatedProgress,
                milestones: updatedMilestones,
                currentMilestoneIndex: nextMilestoneIndex,
                isCompleted: allMilestonesCompleted || calculatedProgress >= quest.maxProgress
              };
            }
            
            // Just update progress (but still calculate based on milestones)
            const completedMilestonesCount = quest.milestones.filter(m => m.isCompleted).length;
            const calculatedProgress = Math.round((completedMilestonesCount / quest.milestones.length) * quest.maxProgress);
            
            return {
              ...quest,
              progress: calculatedProgress,
              isCompleted: calculatedProgress >= quest.maxProgress
            };
          }
          return quest;
        })
      };
    
    case 'COMPLETE_QUEST':
      return {
        ...state,
        questProgress: state.questProgress.map(quest =>
          quest.id === action.payload
            ? { ...quest, isCompleted: true, progress: quest.maxProgress }
            : quest
        )
      };
    
    case 'GRANT_INSPIRATION':
      return {
        ...state,
        inspiration: true
      };
    
    case 'USE_INSPIRATION':
      return {
        ...state,
        inspiration: false
      };
    
    case 'UPDATE_STATS':
      return {
        ...state,
        gameStats: {
          ...state.gameStats,
          ...action.payload
        }
      };
    
    case 'ADD_ITEM':
      return {
        ...state,
        inventory: [...state.inventory, action.payload]
      };
    
    case 'REMOVE_ITEM':
      return {
        ...state,
        inventory: state.inventory.filter(item => item.id !== action.payload)
      };
    
    case 'USE_ITEM':
      // Find the item
      const item = state.inventory.find(i => i.id === action.payload);
      if (!item) return state;
      
      // Remove the item from inventory
      const updatedInventory = state.inventory.filter(i => i.id !== action.payload);
      
      // Apply item effects (simplified)
      return {
        ...state,
        inventory: updatedInventory
      };
    
    case 'REVEAL_AREA':
      if (state.exploredAreas.includes(action.payload)) {
        return state;
      }
      return {
        ...state,
        exploredAreas: [...state.exploredAreas, action.payload]
      };
    
    case 'UPDATE_LOCATION':
      return {
        ...state,
        currentLocation: action.payload,
        worldMemory: {
          ...state.worldMemory,
          exploredLocations: {
            ...state.worldMemory.exploredLocations,
            [action.payload]: {
              visitCount: (state.worldMemory.exploredLocations[action.payload]?.visitCount || 0) + 1,
              lastVisitTimestamp: Date.now(),
              notes: state.worldMemory.exploredLocations[action.payload]?.notes || ''
            }
          }
        }
      };
    
    case 'MARK_ROOM_COMPLETED':
      return {
        ...state,
        map: state.map.map(room =>
          room.id === action.payload
            ? { ...room, isCompleted: true }
            : room
        )
      };
    
    case 'UPDATE_STORY_PROGRESS':
      return {
        ...state,
        storyProgress: {
          ...state.storyProgress,
          ...action.payload
        }
      };
    
    case 'COMPLETE_STORY':
      return {
        ...state,
        storyProgress: {
          ...state.storyProgress,
          isComplete: true
        }
      };
    
    case 'SET_STORY_PRESET':
      const storyPreset = getStoryPresetById(action.payload);
      
      // Generate a quest name based on the story preset
      const questName = generateQuestName(action.payload);
      
      // Update the main quest name
      const updatedQuests = state.questProgress.map(quest => {
        if (quest.isMainQuest) {
          return {
            ...quest,
            name: questName
          };
        }
        return quest;
      });
      
      // Generate a dungeon map based on the preset
      const dungeonMap = generateDungeonMap(storyPreset?.name || 'fantasy');
      
      return {
        ...state,
        storyPreset,
        questProgress: updatedQuests,
        map: dungeonMap,
        exploredAreas: ['entrance'],
        currentLocation: 'entrance',
        storyHistory: storyPreset ? [
          {
            id: `system-${Date.now()}`,
            type: 'system',
            content: `You've chosen the "${storyPreset.name}" adventure. ${storyPreset.description}`,
            timestamp: Date.now()
          },
          {
            id: `dm-${Date.now()}`,
            type: 'dm',
            content: storyPreset.initialStory,
            timestamp: Date.now()
          }
        ] : state.storyHistory
      };
    
    case 'UPDATE_WORLD_MEMORY':
      return {
        ...state,
        worldMemory: action.payload
      };
    
    case 'ADD_COMPANION':
      return {
        ...state,
        companions: [...state.companions, action.payload]
      };
    
    case 'UPDATE_COMPANION':
      return {
        ...state,
        companions: state.companions.map(companion =>
          companion.id === action.payload.id
            ? { ...companion, ...action.payload.updates }
            : companion
        )
      };
    
    case 'REMOVE_COMPANION':
      return {
        ...state,
        companions: state.companions.filter(companion => companion.id !== action.payload)
      };
    
    case 'DRAW_STORY_CARD':
      const newCard = getRandomStoryCard();
      return {
        ...state,
        storyCards: [...state.storyCards, newCard],
        activeStoryCard: newCard
      };
    
    case 'DISCARD_STORY_CARD':
      return {
        ...state,
        storyCards: state.storyCards.map(card =>
          card.id === action.payload
            ? { ...card, isRevealed: true }
            : card
        ),
        activeStoryCard: null
      };
    
    case 'SET_DICE_ROLL_PENDING':
      return {
        ...state,
        diceRollPending: action.payload
      };
    
    case 'ROLL_CHAOS_DICE':
      return {
        ...state,
        lastChaosDiceResult: action.payload,
        chaosDiceAvailable: false
      };
    
    case 'SET_CHAOS_DICE_AVAILABLE':
      return {
        ...state,
        chaosDiceAvailable: action.payload
      };
    
    case 'ADD_SIDE_QUEST':
      return {
        ...state,
        sideQuests: [...(state.sideQuests || []), action.payload]
      };
    
    case 'UPDATE_SIDE_QUEST':
      return {
        ...state,
        sideQuests: (state.sideQuests || []).map(quest =>
          quest.id === action.payload.id
            ? { ...quest, ...action.payload }
            : quest
        )
      };
    
    case 'COMPLETE_SIDE_QUEST':
      return {
        ...state,
        sideQuests: (state.sideQuests || []).map(quest =>
          quest.id === action.payload
            ? { 
                ...quest, 
                isCompleted: true, 
                progress: quest.maxProgress,
                completedAt: Date.now() 
              }
            : quest
        )
      };
    
    case 'COMPLETE_QUEST_MILESTONE':
      return {
        ...state,
        questProgress: state.questProgress.map(quest =>
          quest.id === action.payload.questId
            ? {
                ...quest,
                milestones: quest.milestones.map(milestone =>
                  milestone.id === action.payload.milestoneId
                    ? { ...milestone, isCompleted: true }
                    : milestone
                )
              }
            : quest
        )
      };
    
    case 'UPDATE_CURRENT_MILESTONE':
      return {
        ...state,
        questProgress: state.questProgress.map(quest =>
          quest.id === action.payload.questId
            ? { ...quest, currentMilestoneIndex: action.payload.milestoneIndex }
            : quest
        )
      };
    
    default:
      return state;
  }
}

// Custom hook for game state
export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [savedState, setSavedState] = useState<GameState | null>(null);

  // Load saved game state from localStorage
  useEffect(() => {
    const savedGame = localStorage.getItem('ai-dungeon-master-save');
    if (savedGame) {
      try {
        const parsedState = JSON.parse(savedGame);
        dispatch({ type: 'LOAD_SAVED_STATE', payload: parsedState });
        setSavedState(parsedState);
      } catch (error) {
        console.error('Failed to load saved game:', error);
      }
    }
  }, []);

  // Save game state to localStorage when it changes
  useEffect(() => {
    // Don't save if we're still loading the initial state
    if (state === initialState) return;
    
    // Update game stats with total play time
    const updatedState = {
      ...state,
      gameStats: {
        ...state.gameStats,
        totalPlayTime: Date.now() - state.gameStats.startTime
      }
    };
    
    localStorage.setItem('ai-dungeon-master-save', JSON.stringify(updatedState));
  }, [state]);

  // Check if there's a saved game
  const hasSavedGame = useCallback(() => {
    return savedState !== null;
  }, [savedState]);

  // Gain XP and check for level up
  const gainXP = useCallback((dmResponse: string) => {
    // Parse XP gain from DM response
    const xpMatch = dmResponse.match(/gain (\d+) xp/i);
    if (xpMatch && xpMatch[1]) {
      const xpGained = parseInt(xpMatch[1]);
      
      // Add XP to current total
      const newXP = state.xp + xpGained;
      const xpForNextLevel = state.level * 1000;
      
      // Check for level up
      if (newXP >= xpForNextLevel) {
        // Level up!
        dispatch({
          type: 'UPDATE_STORY_PROGRESS',
          payload: {
            level: state.level + 1,
            xp: newXP - xpForNextLevel,
            maxXp: (state.level + 1) * 1000,
            hasLeveledUp: true
          }
        });
        
        // Play level up sound
        playCharacterSound('levelUp');
        
        // Add level up entry to story
        dispatch({
          type: 'ADD_STORY_ENTRY',
          payload: {
            id: `level-up-${Date.now()}`,
            type: 'level_up',
            content: `🌟 You've reached level ${state.level + 1}! Your power grows as you gain new abilities and strength.`,
            timestamp: Date.now()
          }
        });
      } else {
        // Just update XP
        dispatch({
          type: 'UPDATE_STORY_PROGRESS',
          payload: {
            xp: newXP
          }
        });
      }
      
      // Add XP gain entry to story
      dispatch({
        type: 'ADD_STORY_ENTRY',
        payload: {
          id: `xp-gain-${Date.now()}`,
          type: 'system',
          content: `✨ You gained ${xpGained} experience points!`,
          timestamp: Date.now()
        }
      });
    }
  }, [state.xp, state.level]);

  // Make a death saving throw
  const makeDeathSave = useCallback(() => {
    dispatch({ type: 'DEATH_SAVE' });
  }, []);

  // Update quest progress
  const updateQuest = useCallback((questId: string, progress: number, completedMilestoneId?: string) => {
    dispatch({
      type: 'UPDATE_QUEST',
      payload: {
        id: questId,
        progress,
        completedMilestoneId
      }
    });
    
    // Check if quest is completed
    const quest = state.questProgress.find(q => q.id === questId);
    if (quest) {
      // Count completed milestones
      const updatedMilestones = quest.milestones.map(m => 
        m.id === completedMilestoneId ? { ...m, isCompleted: true } : m
      );
      const completedMilestonesCount = updatedMilestones.filter(m => m.isCompleted).length;
      const calculatedProgress = Math.round((completedMilestonesCount / updatedMilestones.length) * quest.maxProgress);
      
      if (calculatedProgress >= quest.maxProgress || completedMilestonesCount === updatedMilestones.length) {
        // Play quest complete sound
        playQuestSound('complete');
        
        // Add quest completion entry to story
        dispatch({
          type: 'ADD_STORY_ENTRY',
          payload: {
            id: `quest-complete-${Date.now()}`,
            type: 'quest_complete',
            content: `🏆 Quest Completed: ${quest.name}\n${quest.description}`,
            timestamp: Date.now()
          }
        });
        
        // Mark quest as completed
        dispatch({
          type: 'COMPLETE_QUEST',
          payload: questId
        });
      } else if (completedMilestoneId) {
        // Play milestone completion sound
        playQuestSound('milestone');
        
        // Find the completed milestone
        const milestone = quest?.milestones.find(m => m.id === completedMilestoneId);
        
        if (milestone) {
          // Add milestone completion entry to story
          dispatch({
            type: 'ADD_STORY_ENTRY',
            payload: {
              id: `milestone-complete-${Date.now()}`,
              type: 'system',
              content: `✅ Objective Complete: ${milestone.description}`,
              timestamp: Date.now()
            }
          });
        }
      }
    }
  }, [state.questProgress]);

  // Save scene image to localStorage
  const saveSceneImage = useCallback((imageUrl: string) => {
    localStorage.setItem('ai-dungeon-master-scene-image', imageUrl);
  }, []);

  // Get saved scene image from localStorage
  const getSavedSceneImage = useCallback(() => {
    return localStorage.getItem('ai-dungeon-master-scene-image');
  }, []);

  // Clear saved scene image from localStorage
  const clearSavedSceneImage = useCallback(() => {
    localStorage.removeItem('ai-dungeon-master-scene-image');
  }, []);

  // Reveal a new area on the map
  const revealArea = useCallback((areaId: string) => {
    dispatch({ type: 'REVEAL_AREA', payload: areaId });
  }, []);

  // Update current location
  const updateLocation = useCallback((locationId: string) => {
    dispatch({ type: 'UPDATE_LOCATION', payload: locationId });
  }, []);

  // Get connected rooms to current location
  const getConnectedRooms = useCallback(() => {
    const currentRoom = state.map.find(room => room.id === state.currentLocation);
    if (!currentRoom) return [];
    
    return state.map.filter(room => 
      currentRoom.connections.includes(room.id) && 
      state.exploredAreas.includes(room.id)
    );
  }, [state.map, state.currentLocation, state.exploredAreas]);

  // Get unexplored connections from current location
  const getUnexploredConnections = useCallback(() => {
    const currentRoom = state.map.find(room => room.id === state.currentLocation);
    if (!currentRoom) return [];
    
    return currentRoom.connections.filter(id => !state.exploredAreas.includes(id));
  }, [state.map, state.currentLocation, state.exploredAreas]);

  // Mark a room as completed
  const markRoomCompleted = useCallback((roomId: string) => {
    dispatch({ type: 'MARK_ROOM_COMPLETED', payload: roomId });
  }, []);

  // Update story progress
  const updateStoryProgress = useCallback((progressData: any) => {
    dispatch({ type: 'UPDATE_STORY_PROGRESS', payload: progressData });
  }, []);

  // Set story preset
  const setStoryPreset = useCallback((presetId: string) => {
    dispatch({ type: 'SET_STORY_PRESET', payload: presetId });
  }, []);

  // Update world memory
  const updateWorldMemory = useCallback((memoryData: any) => {
    dispatch({ type: 'UPDATE_WORLD_MEMORY', payload: memoryData });
  }, []);

  // Add NPC to world memory
  const addNPC = useCallback((npcId: string, npcData: any) => {
    const updatedWorldMemory = { ...state.worldMemory };
    updatedWorldMemory.knownNPCs[npcId] = npcData;
    dispatch({ type: 'UPDATE_WORLD_MEMORY', payload: updatedWorldMemory });
  }, [state.worldMemory]);

  // Record player decision in world memory
  const recordDecision = useCallback((decision: string, consequence: string) => {
    const updatedWorldMemory = { ...state.worldMemory };
    updatedWorldMemory.playerDecisions.push({
      id: `decision-${Date.now()}`,
      decision,
      consequence,
      timestamp: Date.now()
    });
    dispatch({ type: 'UPDATE_WORLD_MEMORY', payload: updatedWorldMemory });
  }, [state.worldMemory]);

  // Add companion
  const addCompanion = useCallback((companion: any) => {
    dispatch({ type: 'ADD_COMPANION', payload: companion });
  }, []);

  // Update companion
  const updateCompanion = useCallback((companionId: string, updates: any) => {
    dispatch({ 
      type: 'UPDATE_COMPANION', 
      payload: { id: companionId, updates } 
    });
  }, []);

  // Remove companion
  const removeCompanion = useCallback((companionId: string) => {
    dispatch({ type: 'REMOVE_COMPANION', payload: companionId });
  }, []);

  // Draw a story card
  const drawStoryCard = useCallback(() => {
    dispatch({ type: 'DRAW_STORY_CARD' });
  }, []);

  // Discard a story card
  const discardStoryCard = useCallback((cardId: string) => {
    dispatch({ type: 'DISCARD_STORY_CARD', payload: cardId });
  }, []);

  // Set dice roll pending
  const setDiceRollPending = useCallback((isPending: boolean) => {
    dispatch({ type: 'SET_DICE_ROLL_PENDING', payload: isPending });
  }, []);

  // Roll chaos dice
  const rollChaosDice = useCallback((result: number) => {
    dispatch({ type: 'ROLL_CHAOS_DICE', payload: result });
  }, []);

  // Set chaos dice available
  const setChaosDiceAvailable = useCallback((isAvailable: boolean) => {
    dispatch({ type: 'SET_CHAOS_DICE_AVAILABLE', payload: isAvailable });
  }, []);

  // Save legend to hall of legends
  const saveLegendToHall = useCallback((legend: any) => {
    try {
      const savedLegends = localStorage.getItem('ai-dungeon-master-legends');
      let legends = savedLegends ? JSON.parse(savedLegends) : [];
      legends.push(legend);
      localStorage.setItem('ai-dungeon-master-legends', JSON.stringify(legends));
    } catch (error) {
      console.error('Failed to save legend:', error);
    }
  }, []);

  // Get legends from hall of legends
  const getLegends = useCallback(() => {
    try {
      const savedLegends = localStorage.getItem('ai-dungeon-master-legends');
      return savedLegends ? JSON.parse(savedLegends) : [];
    } catch (error) {
      console.error('Failed to load legends:', error);
      return [];
    }
  }, []);

  // Add side quest
  const addSideQuest = useCallback((sideQuest: SideQuest) => {
    dispatch({ type: 'ADD_SIDE_QUEST', payload: sideQuest });
    
    // Play quest discovery sound
    playQuestSound('discover');
    
    // Add side quest discovery entry to story
    dispatch({
      type: 'ADD_STORY_ENTRY',
      payload: {
        id: `side-quest-discover-${Date.now()}`,
        type: 'system',
        content: `📜 New Side Quest: ${sideQuest.title}\n${sideQuest.description}`,
        timestamp: Date.now()
      }
    });
  }, []);

  // Update side quest
  const updateSideQuest = useCallback((questId: string, updates: any) => {
    dispatch({ 
      type: 'UPDATE_SIDE_QUEST', 
      payload: { id: questId, ...updates } 
    });
    
    // If progress is updated, play update sound
    if (updates.progress !== undefined) {
      playQuestSound('update');
    }
  }, []);

  // Complete side quest
  const completeSideQuest = useCallback((questId: string) => {
    dispatch({ type: 'COMPLETE_SIDE_QUEST', payload: questId });
    
    // Play quest complete sound
    playQuestSound('complete');
    
    // Find the quest
    const quest = state.sideQuests?.find(q => q.id === questId);
    
    if (quest) {
      // Add quest completion entry to story
      dispatch({
        type: 'ADD_STORY_ENTRY',
        payload: {
          id: `side-quest-complete-${Date.now()}`,
          type: 'system',
          content: `🏆 Side Quest Completed: ${quest.title}\n${quest.reward}`,
          timestamp: Date.now()
        }
      });
    }
  }, [state.sideQuests]);

  return {
    state,
    dispatch,
    gainXP,
    makeDeathSave,
    updateQuest,
    hasSavedGame,
    saveSceneImage,
    getSavedSceneImage,
    clearSavedSceneImage,
    // Map functions
    revealArea,
    updateLocation,
    getConnectedRooms,
    getUnexploredConnections,
    markRoomCompleted,
    // Story progression
    updateStoryProgress,
    // New feature functions
    setStoryPreset,
    updateWorldMemory,
    addNPC,
    recordDecision,
    addCompanion,
    updateCompanion,
    removeCompanion,
    drawStoryCard,
    discardStoryCard,
    setDiceRollPending,
    rollChaosDice,
    setChaosDiceAvailable,
    saveLegendToHall,
    getLegends,
    // Side quest functions
    addSideQuest,
    updateSideQuest,
    completeSideQuest
  };
}