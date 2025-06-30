import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameInterface } from './GameInterface';
import { FloatingEmbers } from './FloatingEmbers';
import { BackgroundMusic } from './BackgroundMusic';
import { GameOverScreen } from './GameOverScreen';
import { DeathSaveTracker } from './DeathSaveTracker';
import { VoiceCommandButton } from './VoiceCommandButton';
import { GameState, StoryEntry, LegendEntry, SideQuest, QuestMilestone } from '../types/game';
import { Character } from '../types/character';
import { OpenAIService, AIGameResponse } from '../services/openai';
import { ElevenLabsService } from '../services/elevenlabs';
import { DalleService } from '../services/dalle';
import { Minimap } from './Minimap';
import { SideQuestDisplay } from './SideQuestDisplay';
import { LoadingScreen } from './LoadingScreen';
import { GaetoOmenModal } from './GaetoOmenModal';
import { LevelUpSummary } from './LevelUpSummary';
import { StoryRerollModal } from './StoryRerollModal';
import { NotificationSystem } from './NotificationSystem';

// Enhanced logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[SINGLE PLAYER INFO] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[SINGLE PLAYER ERROR] ${message}`, error || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[SINGLE PLAYER WARN] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    console.log(`[SINGLE PLAYER DEBUG] ${message}`, data || '');
  }
};

// Sound effects utility
const playUISound = (soundName: string) => {
  try {
    const audio = new Audio(`/sounds/${soundName}.mp3`);
    audio.volume = 0.3;
    audio.play().catch(err => {
      console.warn(`Failed to play sound ${soundName}:`, err);
    });
  } catch (error) {
    console.warn(`Error playing sound ${soundName}:`, error);
  }
};

interface SinglePlayerGameFlowProps {
  gameState: GameState;
  character: Character;
  dispatch: React.Dispatch<any>;
  openaiService: OpenAIService;
  elevenlabsService: ElevenLabsService;
  dalleService: DalleService;
  currentSceneImage?: string;
  isSceneLoading?: boolean;
  loadingStates?: {
    text: boolean;
    voice: boolean;
    image: boolean;
  };
  showMinimap: boolean;
  onToggleMinimap: () => void;
  onShowCharacterSheet: () => void;
  onShowSessionManager: () => void;
  onBackToHome?: () => void;
  onNewAdventure: () => void;
  // Game state functions
  gainXP: (dmResponse: string) => void;
  makeDeathSave: () => void;
  updateQuest: (questId: string, progress: number, completedMilestoneId?: string) => void;
  updateSceneImage: (imageUrl: string) => void;
  // Character functions
  takeDamage: (damage: number) => any;
  healCharacter: (healing: number) => any;
  gainExperience: (xp: number) => void;
  grantInspiration: () => void;
  addCondition: (condition: any) => void;
  // World memory functions
  addNPC: (npcId: string, npcData: any) => void;
  recordDecision: (decision: string, consequence: string) => void;
  // Companion functions
  addCompanion: (companion: any) => void;
  updateCompanion: (companionId: string, updates: any) => void;
  removeCompanion: (companionId: string) => void;
  // Story card functions
  drawStoryCard: () => any;
  discardStoryCard: (cardId: string) => void;
  // Map functions
  updateLocation: (locationId: string) => void;
  revealArea: (areaId: string) => void;
  markRoomCompleted: (roomId: string) => void;
  // Story functions
  updateStoryProgress: (progressData: any) => void;
  setStoryPreset: (presetId: string) => void;
  // Side quest functions
  addSideQuest: (sideQuest: any) => void;
  updateSideQuest: (questId: string, updates: any) => void;
  completeSideQuest: (questId: string) => void;
}

export function SinglePlayerGameFlow({
  gameState,
  character,
  dispatch,
  openaiService,
  elevenlabsService,
  dalleService,
  currentSceneImage,
  isSceneLoading,
  loadingStates = { text: false, voice: false, image: false },
  showMinimap,
  onToggleMinimap,
  onShowCharacterSheet,
  onShowSessionManager,
  onBackToHome,
  onNewAdventure,
  // Game state functions
  gainXP,
  makeDeathSave,
  updateQuest,
  updateSceneImage,
  // Character functions
  takeDamage,
  healCharacter,
  gainExperience,
  grantInspiration,
  addCondition,
  // World memory functions
  addNPC,
  recordDecision,
  // Companion functions
  addCompanion,
  updateCompanion,
  removeCompanion,
  // Story card functions
  drawStoryCard,
  discardStoryCard,
  // Map functions
  updateLocation,
  revealArea,
  markRoomCompleted,
  // Story functions
  updateStoryProgress,
  setStoryPreset,
  // Side quest functions
  addSideQuest,
  updateSideQuest,
  completeSideQuest
}: SinglePlayerGameFlowProps) {
  const [isLocalSceneLoading, setIsLocalSceneLoading] = useState(isSceneLoading);
  const [showSideQuestModal, setShowSideQuestModal] = useState(false);
  const [newSideQuest, setNewSideQuest] = useState<SideQuest | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Weaving your tale...");
  const [audioPlaybackAttempts, setAudioPlaybackAttempts] = useState(0);
  const [showGaetoOmenModal, setShowGaetoOmenModal] = useState(false);
  const [gaetoOmenDetails, setGaetoOmenDetails] = useState<any>(null);
  const [showLevelUpSummary, setShowLevelUpSummary] = useState(false);
  const [levelUpDetails, setLevelUpDetails] = useState<any>(null);
  const [showStoryRerollModal, setShowStoryRerollModal] = useState(false);
  const [lastPlayerAction, setLastPlayerAction] = useState<string>('');
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: string}>>([]);
  
  // Audio container reference for visible audio elements
  const audioContainerRef = useRef<HTMLDivElement | null>(null);

  // Set character context for character-centric world generation
  useEffect(() => {
    if (character) {
      openaiService.setCharacterContext(character.name, character.background || '');
    }
  }, [character, openaiService]);

  // Process structured AI response
  const processAIResponse = useCallback((aiResponse: AIGameResponse, character: Character) => {
    logger.debug('Processing structured AI response', aiResponse);

    // Process damage
    if (aiResponse.damage_taken && aiResponse.damage_taken > 0) {
      const damageResult = takeDamage(aiResponse.damage_taken);
      if (damageResult?.isDying) {
        logger.warn('Character is dying', { characterName: character.name });
        dispatch({ type: 'SET_DEATH', payload: true });
      }
    }

    // Process healing
    if (aiResponse.healing_received && aiResponse.healing_received > 0) {
      healCharacter(aiResponse.healing_received);
    }

    // Process XP gain
    if (aiResponse.xp_gained && aiResponse.xp_gained > 0) {
      logger.info('XP gained from structured response', { xpGained: aiResponse.xp_gained });
      gainExperience(aiResponse.xp_gained);
      gainXP(`gain ${aiResponse.xp_gained} xp`); // Also update game state
      
      // Show notification for XP gain
      addNotification(`Gained ${aiResponse.xp_gained} XP!`, 'success');
    }

    // Process item discovery
    if (aiResponse.item_found) {
      const newItem = {
        id: `item-${Date.now()}`,
        name: aiResponse.item_found.name,
        icon: 'treasure',
        description: aiResponse.item_found.description,
        type: aiResponse.item_found.type,
        rarity: aiResponse.item_found.rarity || 'common',
        value: aiResponse.item_found.value || 0,
        properties: aiResponse.item_found.properties || [],
        isEquippable: aiResponse.item_found.type === 'weapon' || aiResponse.item_found.type === 'armor',
        equipmentSlot: aiResponse.item_found.type === 'weapon' ? 'mainHand' : 
                      aiResponse.item_found.type === 'armor' ? 'armor' : undefined
      };
      
      logger.info('Adding discovered item', { itemName: newItem.name });
      dispatch({ type: 'ADD_ITEM', payload: newItem });
      
      // Show notification for item discovery
      addNotification(`Found: ${newItem.name}!`, 'special');
    }

    // Process quest updates with milestone support
    if (aiResponse.quest_update) {
      logger.debug('Quest progress updated', aiResponse.quest_update);
      
      if (aiResponse.quest_update.milestone_completed) {
        // Complete the specific milestone
        updateQuest(
          aiResponse.quest_update.id, 
          aiResponse.quest_update.progress,
          aiResponse.quest_update.milestone_completed
        );
        
        // Show notification for milestone completion
        const quest = gameState.questProgress.find(q => q.id === aiResponse.quest_update.id);
        const milestone = quest?.milestones.find(m => m.id === aiResponse.quest_update.milestone_completed);
        if (milestone) {
          addNotification(`Objective Complete: ${milestone.description}`, 'success');
        }
      } else {
        // Just update the progress
        updateQuest(aiResponse.quest_update.id, aiResponse.quest_update.progress);
      }
    }

    // Process conditions
    if (aiResponse.conditions_added && aiResponse.conditions_added.length > 0) {
      aiResponse.conditions_added.forEach(condition => {
        addCondition(condition);
        
        // Show notification for condition
        addNotification(`Condition: ${condition.name}`, 'warning');
      });
    }

    if (aiResponse.conditions_removed && aiResponse.conditions_removed.length > 0) {
      aiResponse.conditions_removed.forEach(conditionName => {
        // Remove condition logic would go here
        logger.debug('Removing condition', { conditionName });
        
        // Show notification for condition removal
        addNotification(`Condition Removed: ${conditionName}`, 'info');
      });
    }

    // Process inspiration
    if (aiResponse.inspiration_granted) {
      logger.info('Granting inspiration from structured response');
      grantInspiration();
      dispatch({ type: 'GRANT_INSPIRATION' });
      
      // Show notification for inspiration
      addNotification('Inspiration Granted!', 'special');
    }

    // Process dice rolls
    if (aiResponse.dice_rolls && aiResponse.dice_rolls.length > 0) {
      logger.debug('Processing dice rolls from structured response', aiResponse.dice_rolls);
      // Dice rolls are already included in the response, no additional processing needed
    }

    // Process location updates
    if (aiResponse.location_update) {
      // Update current location if provided
      if (aiResponse.location_update.current_location) {
        logger.info('Updating player location', { newLocation: aiResponse.location_update.current_location });
        updateLocation(aiResponse.location_update.current_location);
      }
      
      // Reveal newly discovered locations
      if (aiResponse.location_update.discovered_locations && aiResponse.location_update.discovered_locations.length > 0) {
        logger.info('Revealing new areas', { areas: aiResponse.location_update.discovered_locations });
        aiResponse.location_update.discovered_locations.forEach(locationId => {
          revealArea(locationId);
        });
      }
      
      // Mark room as completed if specified
      if (aiResponse.location_update.room_completed) {
        logger.info('Marking room as completed', { roomId: aiResponse.location_update.room_completed });
        markRoomCompleted(aiResponse.location_update.room_completed);
      }
    }

    // Process story progression
    if (aiResponse.story_progress) {
      logger.info('Updating story progress', aiResponse.story_progress);
      updateStoryProgress(aiResponse.story_progress);
      
      // Check for story completion
      if (aiResponse.story_progress.is_ending && 
          (aiResponse.story.includes('conclusion') || 
           aiResponse.story.includes('the end') || 
           aiResponse.story.includes('adventure reaches its end'))) {
        logger.info('Story has reached its conclusion');
        dispatch({ type: 'COMPLETE_STORY' });
        dispatch({ type: 'SET_WIN', payload: true });
        
        // Save legend to hall of fame
        const generateLegendTitle = async () => {
          if (openaiService) {
            try {
              const title = await openaiService.generateLegacyTitle(
                character.name,
                `Level ${character.level} ${character.class.name}`,
                gameState.storyHistory
              );
              
              const legend: LegendEntry = {
                id: `legend-${Date.now()}`,
                playerName: 'Adventurer',
                characterName: character.name,
                characterClass: character.class.name,
                level: character.level,
                title: title,
                summary: aiResponse.story,
                imageUrl: currentSceneImage,
                achievements: [
                  `Defeated ${gameState.gameStats.enemiesDefeated} enemies`,
                  `Found ${gameState.gameStats.treasuresFound} treasures`,
                  `Survived for ${Math.floor(gameState.gameStats.totalPlayTime / (1000 * 60 * 60))} hours`
                ],
                completedAt: Date.now()
              };
              
              // Save to hall of legends
              const savedLegends = localStorage.getItem('ai-dungeon-master-legends');
              let legends = savedLegends ? JSON.parse(savedLegends) : [];
              legends.push(legend);
              localStorage.setItem('ai-dungeon-master-legends', JSON.stringify(legends));
              
            } catch (error) {
              console.error('Failed to generate legend title:', error);
            }
          }
        };
        
        generateLegendTitle();
      }
    }

    // Process dice roll requests
    if (aiResponse.story.toLowerCase().includes('roll') && 
        (aiResponse.story.toLowerCase().includes('dice') || 
         aiResponse.story.toLowerCase().includes('d20') || 
         aiResponse.story.toLowerCase().includes('check') || 
         aiResponse.story.toLowerCase().includes('saving throw'))) {
      logger.info('Dice roll requested in story');
      dispatch({ type: 'SET_DICE_ROLL_PENDING', payload: true });
    }

    // Randomly enable chaos dice (10% chance)
    if (Math.random() < 0.1 && !gameState.chaosDiceAvailable) {
      logger.info('Chaos dice now available');
      dispatch({ type: 'SET_CHAOS_DICE_AVAILABLE', payload: true });
      
      // Show notification for chaos dice
      addNotification('Chaos Dice Available!', 'special');
    }

    // Process NPC interactions
    const npcMatch = aiResponse.story.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?) (?:says|replied|asked|exclaimed|whispered)/);
    if (npcMatch && npcMatch[1]) {
      const npcName = npcMatch[1];
      
      // Check if this is a new NPC
      if (!gameState.worldMemory.knownNPCs[npcName.toLowerCase()]) {
        // Extract a description from the story
        const beforeNpcMention = aiResponse.story.split(npcName)[0];
        const descriptionMatch = beforeNpcMention.match(/([^.!?]+[.!?])\s*$/);
        const description = descriptionMatch ? descriptionMatch[1] : 'A character you encountered on your journey.';
        
        // Add NPC to world memory
        addNPC(npcName.toLowerCase(), {
          name: npcName,
          description: description,
          attitude: 'neutral',
          lastInteraction: aiResponse.story,
          location: gameState.currentLocation,
          isAlive: true
        });
        
        logger.info('Added new NPC to world memory', { npcName });
      } else {
        // Update existing NPC
        const npc = gameState.worldMemory.knownNPCs[npcName.toLowerCase()];
        const updatedWorldMemory = { ...gameState.worldMemory };
        
        updatedWorldMemory.knownNPCs[npcName.toLowerCase()] = {
          ...npc,
          lastInteraction: aiResponse.story,
          location: gameState.currentLocation
        };
        
        dispatch({ type: 'UPDATE_WORLD_MEMORY', payload: updatedWorldMemory });
        logger.info('Updated NPC in world memory', { npcName });
      }
    }

    // Process enhanced NPC reaction
    if (aiResponse.npc_reaction) {
      const { name, attitude_change, information_gained, relationship_change, dialogue } = aiResponse.npc_reaction;
      
      // Update or create NPC in world memory
      const npcId = name.toLowerCase();
      const existingNpc = gameState.worldMemory.knownNPCs[npcId];
      
      if (existingNpc) {
        // Update existing NPC
        const updatedWorldMemory = { ...gameState.worldMemory };
        updatedWorldMemory.knownNPCs[npcId] = {
          ...existingNpc,
          attitude: attitude_change || existingNpc.attitude,
          lastInteraction: dialogue || aiResponse.story,
          location: gameState.currentLocation
        };
        
        dispatch({ type: 'UPDATE_WORLD_MEMORY', payload: updatedWorldMemory });
        logger.info('Updated NPC with reaction data', { npcName: name, attitude: attitude_change });
      } else {
        // Create new NPC
        addNPC(npcId, {
          name,
          description: `A character you met during your adventure. ${information_gained || ''}`,
          attitude: attitude_change || 'neutral',
          lastInteraction: dialogue || aiResponse.story,
          location: gameState.currentLocation,
          isAlive: true
        });
        
        logger.info('Added new NPC from reaction data', { npcName: name });
      }
      
      // Record significant information as a decision
      if (information_gained) {
        recordDecision(
          `Interacted with ${name}`,
          `Learned: ${information_gained}`
        );
      }
    }

    // Process puzzle solved status
    if (aiResponse.puzzle_solved) {
      const { is_solved, solution_details, reward } = aiResponse.puzzle_solved;
      
      if (is_solved) {
        // Update game stats
        dispatch({ 
          type: 'UPDATE_STATS', 
          payload: { puzzlesSolved: gameState.gameStats.puzzlesSolved + 1 } 
        });
        
        // Record the solution
        recordDecision(
          `Solved a puzzle`,
          solution_details || 'Found the correct solution'
        );
        
        // If there's a reward, could trigger item discovery or other effects
        if (reward) {
          logger.info('Puzzle reward:', reward);
          // Could potentially add an item or trigger other effects here
          
          // Show notification for puzzle solved
          addNotification(`Puzzle Solved: ${solution_details}`, 'success');
        }
      }
    }

    // Process combat summary
    if (aiResponse.combat_summary) {
      const { enemies_defeated, player_status, damage_dealt, damage_taken, critical_hits, loot_gained } = aiResponse.combat_summary;
      
      // Update game stats
      if (enemies_defeated && enemies_defeated.length > 0) {
        dispatch({ 
          type: 'UPDATE_STATS', 
          payload: { 
            enemiesDefeated: gameState.gameStats.enemiesDefeated + enemies_defeated.length,
            totalDamageDealt: gameState.gameStats.totalDamageDealt + (damage_dealt || 0),
            totalDamageTaken: gameState.gameStats.totalDamageTaken + (damage_taken || 0),
            criticalHits: gameState.gameStats.criticalHits + (critical_hits || 0)
          } 
        });
        
        // Show notification for combat victory
        if (player_status === 'victorious') {
          addNotification(`Defeated ${enemies_defeated.join(', ')}!`, 'success');
        }
      }
      
      // Record the combat outcome
      recordDecision(
        `Engaged in combat with ${enemies_defeated.join(', ')}`,
        `Outcome: ${player_status}. Defeated ${enemies_defeated.length} enemies.`
      );
    }

    // Process skill check outcome
    if (aiResponse.skill_check) {
      const { skill, success, difficulty, roll_value, narrative_effect } = aiResponse.skill_check;
      
      // Record the skill check
      recordDecision(
        `Attempted ${skill} check (DC ${difficulty})`,
        `${success ? 'Success' : 'Failure'}${roll_value ? ` with roll of ${roll_value}` : ''}. ${narrative_effect}`
      );
      
      // Show notification for skill check
      addNotification(`${skill.charAt(0).toUpperCase() + skill.slice(1)} Check: ${success ? 'Success!' : 'Failed'}`, success ? 'success' : 'warning');
    }

    // Process side quest suggestion (with 20% chance of accepting)
    if (aiResponse.side_quest_suggestion && Math.random() < 0.2) {
      const { title, description, difficulty, reward, related_to, milestones } = aiResponse.side_quest_suggestion;
      
      // Create side quest milestones
      const questMilestones: QuestMilestone[] = milestones.map((m, index) => ({
        id: `side-quest-milestone-${Date.now()}-${index}`,
        description: m.description,
        isCompleted: false,
        location: m.location
      }));
      
      // Create the side quest
      const newSideQuest: SideQuest = {
        id: `side-quest-${Date.now()}`,
        title,
        description,
        difficulty: difficulty || 'medium',
        reward,
        relatedTo: related_to,
        isCompleted: false,
        progress: 0,
        maxProgress: questMilestones.length,
        milestones: questMilestones,
        currentMilestoneIndex: 0,
        createdAt: Date.now()
      };
      
      // Show the side quest modal
      setNewSideQuest(newSideQuest);
      setShowSideQuestModal(true);
    }

    // Check for companion opportunities (5% chance)
    if (Math.random() < 0.05 && gameState.companions.length < 2 && 
        (aiResponse.story.includes('offers to join you') || 
         aiResponse.story.includes('willing to accompany you') ||
         aiResponse.story.includes('could use your help'))) {
      
      // Try to extract companion name
      const companionMatch = aiResponse.story.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?) (?:offers|is willing|would like|agrees)/);
      if (companionMatch && companionMatch[1]) {
        const companionName = companionMatch[1];
        
        // Create a new companion
        const newCompanion = {
          id: `companion-${Date.now()}`,
          name: companionName,
          description: `A character you met during your adventure who decided to join you.`,
          personality: 'Helpful and loyal',
          loyalty: 70,
          skills: ['Perception', 'Survival'],
          backstory: 'You met this character during your adventure.',
          relationship: 'loyal' as const,
          joinedAt: Date.now(),
          lastInteraction: aiResponse.story,
          memories: [{
            id: `memory-${Date.now()}`,
            content: `Met the adventurer ${character.name} and decided to join their quest.`,
            importance: 8,
            timestamp: Date.now()
          }]
        };
        
        addCompanion(newCompanion);
        logger.info('Added new companion', { companionName });
        
        // Show notification for new companion
        addNotification(`${companionName} has joined your party!`, 'success');
      }
    }
  }, [character, takeDamage, healCharacter, gainExperience, gainXP, dispatch, updateLocation, revealArea, markRoomCompleted, updateStoryProgress, gameState.worldMemory, gameState.currentLocation, gameState.companions, gameState.chaosDiceAvailable, gameState.storyHistory, gameState.gameStats, addNPC, addCompanion, updateQuest, addCondition, grantInspiration, recordDecision, addSideQuest, currentSceneImage]);

  // Add notification function
  const addNotification = useCallback((message: string, type: string = 'info') => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Check for level up and show level up summary
  useEffect(() => {
    if (gameState.hasLeveledUp && !showLevelUpSummary) {
      // Generate level up details
      const newLevel = character.level;
      const newAbilities = character.class.classFeatures.filter(feature => feature.level === newLevel);
      
      setLevelUpDetails({
        newLevel,
        statIncreases: {
          hitPoints: Math.floor(character.class.hitDie / 2) + 1, // Average roll + 1
          proficiencyBonus: character.proficiencyBonus
        },
        newAbilities
      });
      
      setShowLevelUpSummary(true);
    }
  }, [gameState.hasLeveledUp, character, showLevelUpSummary]);

  // Check for Gaeto appearance (10% chance after each player action)
  const checkForGaetoAppearance = useCallback(async () => {
    // Only check if Gaeto hasn't been introduced yet
    if (!gameState.worldMemory.persistentFlags?.gaetoIntroduced && Math.random() < 0.1) {
      try {
        // Generate Gaeto's details
        const omenDetails = await openaiService.generateGaetoOmen(character.name);
        setGaetoOmenDetails(omenDetails);
        
        // Show the Gaeto omen modal
        setShowGaetoOmenModal(true);
        
        // Add Gaeto to world memory
        addNPC('gaeto', {
          name: 'Gaeto',
          description: omenDetails.appearance,
          attitude: omenDetails.role.toLowerCase().includes('nemesis') || 
                   omenDetails.role.toLowerCase().includes('adversary') ? 
                   'hostile' : 'neutral',
          lastInteraction: omenDetails.backstory,
          location: gameState.currentLocation,
          isAlive: true,
          role: omenDetails.role,
          relationship: omenDetails.relationship
        });
        
        // Mark Gaeto as introduced in world memory
        const updatedWorldMemory = { ...gameState.worldMemory };
        updatedWorldMemory.persistentFlags = {
          ...updatedWorldMemory.persistentFlags,
          gaetoIntroduced: true
        };
        dispatch({ type: 'UPDATE_WORLD_MEMORY', payload: updatedWorldMemory });
        
        // Add a system entry about Gaeto's appearance
        const systemEntry: StoryEntry = {
          id: `gaeto-appearance-${Date.now()}`,
          type: 'system',
          content: `The air shimmers as Gaeto, ${omenDetails.role}, makes his presence known. ${omenDetails.appearance}`,
          timestamp: Date.now()
        };
        dispatch({ type: 'ADD_STORY_ENTRY', payload: systemEntry });
        
        return true;
      } catch (error) {
        logger.error('Failed to generate Gaeto omen', error);
        return false;
      }
    }
    return false;
  }, [gameState.worldMemory, character.name, gameState.currentLocation, openaiService, addNPC, dispatch]);

  const handlePlayerAction = useCallback(async (playerInput: string) => {
    if (!character) {
      logger.warn('Attempted player action without character');
      return;
    }

    // Play UI click sound
    playUISound('ui_click');

    logger.info('Processing player action', { playerInput, characterName: character.name });
    setLastPlayerAction(playerInput);

    // Reset all loading states
    dispatch({ type: 'SET_LOADING', payload: true });
    setShowLoadingScreen(true);
    setLoadingProgress(10);
    setLoadingMessage("Weaving your tale...");
    
    try {
      // Add player input to story
      const playerEntry: StoryEntry = {
        id: `player-${Date.now()}`,
        type: 'player',
        content: playerInput,
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_STORY_ENTRY', payload: playerEntry });

      // Prepare story context for GPT with character info
      const storyContext = gameState.storyHistory.map(entry => ({
        type: entry.type,
        content: entry.content
      }));
      storyContext.push({ type: 'player', content: playerInput });

      // Get inventory names for context
      const inventory = character.inventory.map(item => item.name);

      logger.debug('Generating structured AI response', { characterContext: character.name, storyContextLength: storyContext.length });
      setLoadingProgress(30);
      setLoadingMessage("The storyteller ponders your actions...");

      // Get active quests for context
      const activeQuests = gameState.questProgress.filter(q => !q.isCompleted);

      // Check for Gaeto appearance
      const gaetoAppeared = await checkForGaetoAppearance();
      if (gaetoAppeared) {
        // If Gaeto appeared, we'll skip the normal AI response for this turn
        dispatch({ type: 'SET_LOADING', payload: false });
        setShowLoadingScreen(false);
        return;
      }

      // Start streaming mode
      setIsStreaming(true);
      setStreamingText('');

      // Generate streaming AI response
      await openaiService.generateStreamingStructuredStory(
        playerInput,
        storyContext,
        inventory,
        character.level,
        character.experience,
        gameState.currentLocation,
        gameState.exploredAreas,
        activeQuests,
        (chunk) => {
          // Update streaming text as chunks arrive
          setStreamingText(prev => prev + chunk);
        },
        (aiResponse) => {
          // Process the complete response
          logger.info('Structured AI response generated', aiResponse);
          setLoadingProgress(60);
          setLoadingMessage("Crafting the perfect response...");

          // Process the structured response
          processAIResponse(aiResponse, character);

          // Create DM entry with enhanced data
          const dmEntry: StoryEntry = {
            id: `dm-${Date.now()}`,
            type: 'dm',
            content: aiResponse.story,
            timestamp: Date.now(),
            diceRolls: aiResponse.dice_rolls,
            damageDealt: aiResponse.damage_dealt,
            damageTaken: aiResponse.damage_taken
          };

          // Add DM response to story
          dispatch({ type: 'ADD_STORY_ENTRY', payload: dmEntry });

          // Record significant decisions in world memory
          if (playerInput.length > 20 && 
              (playerInput.includes('decide') || 
               playerInput.includes('choose') || 
               playerInput.includes('accept') || 
               playerInput.includes('reject'))) {
            recordDecision(
              playerInput,
              aiResponse.story
            );
            logger.info('Recorded player decision in world memory');
          }

          // Generate voice narration (async)
          if (elevenlabsService) {
            logger.debug('Generating voice narration');
            setLoadingProgress(75);
            setLoadingMessage("Giving voice to the storyteller...");
            
            elevenlabsService.generateSpeech(aiResponse.story).then(voiceUrl => {
              if (voiceUrl) {
                logger.info('Voice narration generated successfully');
                
                // Update the story entry with the voice URL
                dispatch({
                  type: 'ADD_STORY_ENTRY',
                  payload: { ...dmEntry, voiceUrl }
                });
                
                setLoadingProgress(90);
                setAudioPlaybackAttempts(0);
                
                // Try auto-playing if enabled
                if (gameState.autoPlayVoice) {
                  try {
                    const audio = new Audio(voiceUrl);
                    audio.volume = 0.7;
                    
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                      playPromise.then(() => {
                        logger.info('Auto-playing voice narration');
                        
                        // Update the story entry to show it's playing
                        dispatch({
                          type: 'TOGGLE_VOICE',
                          payload: { id: dmEntry.id, isPlaying: true }
                        });
                      }).catch(err => {
                        logger.warn('Auto-play failed, may need user interaction:', err);
                      });
                    }
                  } catch (error) {
                    logger.error('Audio playback error:', error);
                  }
                }
              } else {
                logger.warn('Voice narration generation failed');
              }
            }).catch(error => {
              logger.error('Failed to generate voice', error);
            });
          } else {
            logger.debug('ElevenLabs service not configured, skipping voice generation');
          }

          // Generate scene image (async)
          if (dalleService) {
            logger.debug('Generating scene image');
            setIsLocalSceneLoading(true);
            setLoadingProgress(85);
            setLoadingMessage("Conjuring a vision of your adventure...");
            
            try {
              openaiService.generateScenePrompt(aiResponse.story).then(scenePrompt => {
                dalleService.generateImage(scenePrompt).then(imageUrl => {
                  if (imageUrl) {
                    logger.info('Scene image generated successfully');
                    updateSceneImage(imageUrl);
                    setLoadingProgress(100);
                  } else {
                    logger.warn('Scene image generation failed');
                  }
                  setIsLocalSceneLoading(false);
                  setShowLoadingScreen(false);
                }).catch(error => {
                  logger.error('Failed to generate image', error);
                  setIsLocalSceneLoading(false);
                  setShowLoadingScreen(false);
                });
              }).catch(error => {
                logger.error('Failed to generate scene prompt', error);
                setIsLocalSceneLoading(false);
                setShowLoadingScreen(false);
              });
            } catch (error) {
              logger.error('Failed to generate scene image', error);
              setIsLocalSceneLoading(false);
              setShowLoadingScreen(false);
            }
          } else {
            logger.debug('DALL-E service not configured, skipping image generation');
            setShowLoadingScreen(false);
          }

          // Check for story completion
          if (aiResponse.story_progress?.is_ending || 
              aiResponse.story.toLowerCase().includes('the end') || 
              aiResponse.story.toLowerCase().includes('conclusion of your adventure')) {
            logger.info('Story appears to be ending based on content');
            dispatch({ type: 'UPDATE_STORY_PROGRESS', payload: { isEndingNear: true } });
          }

          // End streaming mode
          setIsStreaming(false);
        }
      );

    } catch (error) {
      logger.error('Error processing player action', error);
      
      // Add error message to story
      const errorEntry: StoryEntry = {
        id: `error-${Date.now()}`,
        type: 'dm',
        content: 'The mystical energies are disrupted... The ancient magic wavers. Please ensure your API keys are properly configured and try again.',
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_STORY_ENTRY', payload: errorEntry });
      setShowLoadingScreen(false);
      setIsStreaming(false);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [gameState.storyHistory, gameState.currentLocation, gameState.exploredAreas, gameState.questProgress, character, dispatch, gainXP, gainExperience, takeDamage, healCharacter, grantInspiration, openaiService, elevenlabsService, dalleService, updateSceneImage, processAIResponse, recordDecision, checkForGaetoAppearance, addNotification, gameState.autoPlayVoice]);

  const handleToggleVoice = useCallback((entryId: string, isPlaying: boolean) => {
    logger.debug('Toggling voice', { entryId, isPlaying });
    dispatch({ type: 'TOGGLE_VOICE', payload: { id: entryId, isPlaying } });
  }, [dispatch]);

  const handleToggleAutoPlay = useCallback(() => {
    logger.debug('Toggling auto-play voice');
    dispatch({ type: 'TOGGLE_AUTO_PLAY' });
  }, [dispatch]);

  const handleClearLevelUp = useCallback(() => {
    logger.debug('Clearing level up notification');
    dispatch({ type: 'CLEAR_LEVEL_UP' });
    setShowLevelUpSummary(false);
  }, [dispatch]);

  // Handle death save rolls
  const handleDeathSave = useCallback(() => {
    if (!character) {
      logger.warn('Attempted death save without character');
      return;
    }
    
    logger.info('Rolling death save', { characterName: character.name });
    makeDeathSave();
  }, [character, makeDeathSave]);

  // Handle revive (divine intervention, resurrection spell, etc.)
  const handleRevive = useCallback(() => {
    if (!character) {
      logger.warn('Attempted revive without character');
      return;
    }
    
    logger.info('Reviving character', { characterName: character.name });
    
    dispatch({ type: 'REVIVE' });
    
    const reviveEntry: StoryEntry = {
      id: `revive-${Date.now()}`,
      type: 'system',
      content: '✨ Divine magic flows through you! You have been revived with 1 hit point. The gods are not yet ready to claim your soul.',
      timestamp: Date.now(),
    };
    
    dispatch({ type: 'ADD_STORY_ENTRY', payload: reviveEntry });
  }, [character, dispatch]);

  // Handle story preset selection
  const handleSelectStoryPreset = useCallback((presetId: string) => {
    logger.info('Selecting story preset', { presetId });
    setStoryPreset(presetId);
  }, [setStoryPreset]);

  // Handle drawing a story card
  const handleDrawStoryCard = useCallback(() => {
    logger.info('Drawing story card');
    return drawStoryCard();
  }, [drawStoryCard]);

  // Handle dice roll
  const handleDiceRoll = useCallback((result: number, isChaos: boolean = false) => {
    logger.info('Dice rolled', { result, isChaos });
    
    if (isChaos) {
      // Handle chaos dice roll
      dispatch({ type: 'ROLL_CHAOS_DICE', payload: result });
      
      // Generate a chaotic event based on the roll
      const chaosEffect = getChaosEffect(result);
      
      // Add chaos effect to story
      const chaosEntry: StoryEntry = {
        id: `chaos-${Date.now()}`,
        type: 'system',
        content: chaosEffect,
        timestamp: Date.now(),
        diceRolls: [{
          type: 'chaos_dice',
          result,
          modifier: 0,
          total: result,
          purpose: 'Chaos Effect'
        }]
      };
      
      dispatch({ type: 'ADD_STORY_ENTRY', payload: chaosEntry });
      
      // Process the chaos effect
      if (result === 20) {
        // Critical success - grant inspiration
        grantInspiration();
        dispatch({ type: 'GRANT_INSPIRATION' });
      } else if (result === 1) {
        // Critical failure - something bad happens
        takeDamage(Math.floor(character.level * 1.5));
      }
      
      // Draw a story card on high rolls
      if (result >= 15) {
        setTimeout(() => {
          handleDrawStoryCard();
        }, 1500);
      }
    } else {
      // Handle normal dice roll
      dispatch({ type: 'SET_DICE_ROLL_PENDING', payload: false });
      
      // Add dice roll to story
      const diceEntry: StoryEntry = {
        id: `dice-${Date.now()}`,
        type: 'system',
        content: `🎲 You rolled a ${result}!`,
        timestamp: Date.now(),
        diceRolls: [{
          type: 'd20',
          result,
          modifier: 0,
          total: result,
          isCritical: result === 20 || result === 1,
          purpose: 'Skill Check'
        }]
      };
      
      dispatch({ type: 'ADD_STORY_ENTRY', payload: diceEntry });
      
      // Continue the story with the roll result
      setTimeout(() => {
        handlePlayerAction(`I rolled a ${result}`);
      }, 1000);
    }
  }, [dispatch, handleDrawStoryCard, handlePlayerAction, grantInspiration, takeDamage, character]);

  // Get chaos effect based on roll
  const getChaosEffect = (roll: number): string => {
    if (roll === 20) {
      return "✨ CRITICAL CHAOS! Reality bends to your will! You feel a surge of power as the fabric of the world momentarily aligns with your desires. You gain Inspiration and a mysterious boon.";
    } else if (roll === 1) {
      return "💥 CHAOTIC DISASTER! The magic backfires spectacularly! Wild energy courses through you, causing damage and attracting unwanted attention.";
    } else if (roll >= 15) {
      return "🌟 The chaos magic responds favorably! Strange but beneficial effects manifest around you, and a new opportunity presents itself.";
    } else if (roll >= 10) {
      return "🔮 The chaos energies swirl unpredictably. The world shifts slightly, changing some aspect of your current situation.";
    } else {
      return "🌑 The chaos magic stirs ominously. Something in your environment becomes more dangerous or unpredictable.";
    }
  };

  // Handle companion interaction
  const handleCompanionInteraction = useCallback((companionId: string, interaction: string) => {
    logger.info('Companion interaction', { companionId, interaction });
    
    const companion = gameState.companions.find(c => c.id === companionId);
    if (!companion) return;
    
    // Add the interaction to the story
    const interactionEntry: StoryEntry = {
      id: `companion-${Date.now()}`,
      type: 'player',
      content: `[To ${companion.name}] ${interaction}`,
      timestamp: Date.now(),
    };
    
    dispatch({ type: 'ADD_STORY_ENTRY', payload: interactionEntry });
    
    // Update companion with the interaction
    const updatedCompanion = { 
      ...companion,
      lastInteraction: interaction,
      // Add a memory of this interaction
      memories: [
        ...companion.memories,
        {
          id: `memory-${Date.now()}`,
          content: interaction,
          importance: 5,
          timestamp: Date.now()
        }
      ]
    };
    
    updateCompanion(companionId, updatedCompanion);
    
    // Generate a response from the companion
    setTimeout(() => {
      handlePlayerAction(`${companion.name}, ${interaction}`);
    }, 500);
  }, [gameState.companions, dispatch, updateCompanion, handlePlayerAction]);

  // Handle companion dismissal
  const handleDismissCompanion = useCallback((companionId: string) => {
    logger.info('Dismissing companion', { companionId });
    
    const companion = gameState.companions.find(c => c.id === companionId);
    if (!companion) return;
    
    // Add the dismissal to the story
    const dismissalEntry: StoryEntry = {
      id: `companion-dismiss-${Date.now()}`,
      type: 'system',
      content: `${companion.name} has left your party. They bid you farewell and go their separate way.`,
      timestamp: Date.now(),
    };
    
    dispatch({ type: 'ADD_STORY_ENTRY', payload: dismissalEntry });
    
    // Remove the companion
    removeCompanion(companionId);
  }, [gameState.companions, dispatch, removeCompanion]);

  // Handle side quest acceptance
  const handleAcceptSideQuest = useCallback(() => {
    if (newSideQuest) {
      addSideQuest(newSideQuest);
      setShowSideQuestModal(false);
      setNewSideQuest(null);
    }
  }, [newSideQuest, addSideQuest]);

  // Handle voice command input
  const handleVoiceInput = useCallback((voiceText: string) => {
    logger.info('Voice command received', { voiceText });
    
    // Play UI sound for voice input
    playUISound('ui_click');
    
    // Automatically submit the voice input as a player action
    handlePlayerAction(voiceText);
  }, [handlePlayerAction]);

  // Save legend when game is won
  useEffect(() => {
    if (gameState.hasWon) {
      const saveLegend = async () => {
        try {
          // Generate a legacy title
          let title = `${character.name}, the Adventurer`;
          if (openaiService) {
            try {
              title = await openaiService.generateLegacyTitle(
                character.name,
                character.class.name,
                gameState.storyHistory
              );
            } catch (error) {
              console.error('Failed to generate legacy title:', error);
            }
          }
          
          // Create legend entry
          const legend: LegendEntry = {
            id: `legend-${Date.now()}`,
            playerName: 'Adventurer',
            characterName: character.name,
            characterClass: character.class.name,
            level: character.level,
            title: title,
            summary: gameState.storyHistory.length > 0 
              ? gameState.storyHistory[gameState.storyHistory.length - 1].content 
              : 'Completed an epic adventure.',
            imageUrl: currentSceneImage,
            achievements: [
              `Defeated ${gameState.gameStats.enemiesDefeated} enemies`,
              `Found ${gameState.gameStats.treasuresFound} treasures`,
              `Survived for ${Math.floor(gameState.gameStats.totalPlayTime / (1000 * 60 * 60))} hours`
            ],
            completedAt: Date.now()
          };
          
          // Save to hall of legends
          const savedLegends = localStorage.getItem('ai-dungeon-master-legends');
          let legends = savedLegends ? JSON.parse(savedLegends) : [];
          legends.push(legend);
          localStorage.setItem('ai-dungeon-master-legends', JSON.stringify(legends));
          
        } catch (error) {
          console.error('Failed to save legend:', error);
        }
      };
      
      saveLegend();
    }
  }, [gameState.hasWon, character, gameState.storyHistory, gameState.gameStats, currentSceneImage, openaiService]);

  // Clean up audio container on unmount
  useEffect(() => {
    return () => {
      if (audioContainerRef.current && document.body.contains(audioContainerRef.current)) {
        document.body.removeChild(audioContainerRef.current);
      }
    };
  }, []);

  // Handle story reroll
  const handleRerollStory = useCallback(() => {
    if (!lastPlayerAction || gameState.isLoading || isStreaming) return;
    
    setShowStoryRerollModal(false);
    
    // Remove the last DM entry
    const updatedHistory = [...gameState.storyHistory];
    const lastDmEntryIndex = updatedHistory.findIndex(entry => entry.type === 'dm');
    if (lastDmEntryIndex !== -1) {
      updatedHistory.splice(lastDmEntryIndex, 1);
      dispatch({ type: 'SET_STORY_HISTORY', payload: updatedHistory });
    }
    
    // Re-process the last player action
    handlePlayerAction(lastPlayerAction);
    
    // Show notification
    addNotification('Rerolling story response...', 'info');
  }, [lastPlayerAction, gameState.storyHistory, gameState.isLoading, isStreaming, dispatch, handlePlayerAction, addNotification]);

  return (
    <div className="relative">
      <FloatingEmbers />
      <BackgroundMusic volume={0.07} autoPlay={true} />
      
      {/* Loading Screen */}
      <LoadingScreen 
        isVisible={showLoadingScreen}
        progress={loadingProgress}
        message={loadingMessage}
        onClose={() => setShowLoadingScreen(false)}
      />
      
      {/* Death Save Tracker */}
      {character && character.hitPoints === 0 && !gameState.isDead && (
        <DeathSaveTracker
          successes={gameState.deathSaves.successes}
          failures={gameState.deathSaves.failures}
          onRollDeathSave={handleDeathSave}
          isVisible={true}
        />
      )}

      {/* Game Over Screen */}
      {(gameState.isDead || gameState.hasWon) && (
        <GameOverScreen
          isDead={gameState.isDead}
          hasWon={gameState.hasWon}
          gameStats={gameState.gameStats}
          characterName={character.name}
          characterLevel={character.level}
          onNewAdventure={onNewAdventure}
          onRevive={gameState.isDead ? handleRevive : undefined}
        />
      )}

      {/* Side Quest Modal */}
      {showSideQuestModal && newSideQuest && (
        <SideQuestDisplay
          quest={newSideQuest}
          onClose={() => setShowSideQuestModal(false)}
          onAccept={handleAcceptSideQuest}
        />
      )}

      {/* Gaeto Omen Modal */}
      {showGaetoOmenModal && gaetoOmenDetails && (
        <GaetoOmenModal
          isOpen={showGaetoOmenModal}
          details={gaetoOmenDetails}
          onClose={() => setShowGaetoOmenModal(false)}
        />
      )}

      {/* Level Up Summary */}
      {showLevelUpSummary && levelUpDetails && (
        <LevelUpSummary
          details={levelUpDetails}
          characterClass={character.class}
          onClose={handleClearLevelUp}
        />
      )}

      {/* Story Reroll Modal */}
      {showStoryRerollModal && (
        <StoryRerollModal
          onConfirm={handleRerollStory}
          onCancel={() => setShowStoryRerollModal(false)}
        />
      )}

      {/* Notification System */}
      <NotificationSystem notifications={notifications} />

      <GameInterface
        gameState={gameState}
        character={character}
        dispatch={dispatch}
        onPlayerAction={handlePlayerAction}
        onToggleVoice={handleToggleVoice}
        onToggleAutoPlay={handleToggleAutoPlay}
        onClearLevelUp={handleClearLevelUp}
        onShowCharacterSheet={onShowCharacterSheet}
        onShowSessionManager={onShowSessionManager}
        onBackToHome={onBackToHome}
        currentSceneImage={currentSceneImage}
        isSceneLoading={isLocalSceneLoading}
        loadingStates={loadingStates}
        minimap={showMinimap && gameState.map.length > 0 && (
          <Minimap
            mapData={gameState.map}
            exploredAreas={gameState.exploredAreas}
            currentLocation={gameState.currentLocation}
          />
        )}
        onToggleMinimap={onToggleMinimap}
        showMinimap={showMinimap}
        onSelectStoryPreset={handleSelectStoryPreset}
        onDrawStoryCard={handleDrawStoryCard}
        onRollDice={handleDiceRoll}
        onInteractWithCompanion={handleCompanionInteraction}
        onDismissCompanion={handleDismissCompanion}
        discardStoryCard={discardStoryCard}
        completeSideQuest={completeSideQuest}
        onRerollStory={() => setShowStoryRerollModal(true)}
        streamingText={streamingText}
        isStreaming={isStreaming}
        // Voice command props
        voiceCommandButton={
          <VoiceCommandButton
            onVoiceInput={handleVoiceInput}
            disabled={gameState.isLoading || isStreaming}
          />
        }
      />
    </div>
  );
}