import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, Volume2, VolumeX, Info, User, RotateCcw, Users, Home, UserPlus, Map, BookOpen, Scroll, Eye, Dice6, Sparkles, Trophy, Compass, RefreshCw } from 'lucide-react';
import { GameState } from '../types/game';
import { Character } from '../types/character';
import { StoryHistory } from './StoryHistory';
import { PlayerStats } from './PlayerStats';
import { SceneImage } from './SceneImage';
import { SceneImageModal } from './SceneImageModal';
import { LevelUpEffect } from './LevelUpEffect';
import { LoadingPlaceholder } from './LoadingPlaceholder';
import { LocationInfo } from './LocationInfo';
import { JournalLog } from './JournalLog';
import { StoryPresetSelector } from './StoryPresetSelector';
import { StoryCardDisplay } from './StoryCardDisplay';
import { DiceRoller } from './DiceRoller';
import { CompanionDisplay } from './CompanionDisplay';
import { WorldMemoryLog } from './WorldMemoryLog';
import { HallOfLegends } from './HallOfLegends';
import { QuestLogPanel } from './QuestLogPanel';
import { SideQuestsLog } from './SideQuestsLog';
import { TypewriterText } from './TypewriterText';

interface GameInterfaceProps {
  gameState: GameState;
  character: Character;
  dispatch: React.Dispatch<any>;
  onPlayerAction: (input: string) => void;
  onToggleVoice: (entryId: string, isPlaying: boolean) => void;
  onToggleAutoPlay: () => void;
  onClearLevelUp: () => void;
  onShowCharacterSheet: () => void;
  onShowSessionManager: () => void;
  onBackToHome?: () => void;
  currentSceneImage?: string;
  isSceneLoading?: boolean;
  loadingStates?: {
    text: boolean;
    voice: boolean;
    image: boolean;
  };
  minimap?: React.ReactNode;
  showMinimap?: boolean;
  onToggleMinimap?: () => void;
  onSelectStoryPreset?: (presetId: string) => void;
  onDrawStoryCard?: () => void;
  onRollDice?: (result: number, isChaos?: boolean) => void;
  onInteractWithCompanion?: (companionId: string, interaction: string) => void;
  onDismissCompanion?: (companionId: string) => void;
  discardStoryCard?: (cardId: string) => void;
  completeSideQuest?: (questId: string) => void;
  onRerollStory?: () => void;
  streamingText?: string;
  isStreaming?: boolean;
}

export function GameInterface({ 
  gameState, 
  character,
  dispatch,
  onPlayerAction, 
  onToggleVoice,
  onToggleAutoPlay,
  onClearLevelUp,
  onShowCharacterSheet,
  onShowSessionManager,
  onBackToHome,
  currentSceneImage,
  isSceneLoading,
  loadingStates = { text: false, voice: false, image: false },
  minimap,
  showMinimap = true,
  onToggleMinimap,
  onSelectStoryPreset,
  onDrawStoryCard,
  onRollDice,
  onInteractWithCompanion,
  onDismissCompanion,
  discardStoryCard,
  completeSideQuest,
  onRerollStory,
  streamingText = '',
  isStreaming = false
}: GameInterfaceProps) {
  const [playerInput, setPlayerInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSceneModal, setShowSceneModal] = useState(false);
  const [lastVoiceEntry, setLastVoiceEntry] = useState<string | null>(null);
  const [showJournal, setShowJournal] = useState(false);
  const [showStoryPresetSelector, setShowStoryPresetSelector] = useState(!gameState.storyPreset && gameState.storyHistory.length === 0);
  const [showWorldMemory, setShowWorldMemory] = useState(false);
  const [showHallOfLegends, setShowHallOfLegends] = useState(false);
  const [showCompanions, setShowCompanions] = useState(false);
  const [showSideQuestsLog, setShowSideQuestsLog] = useState(false);
  const [legends, setLegends] = useState<any[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  
  const legendsRef = useRef<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const journalEndRef = useRef<HTMLDivElement>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);

  // Create a container for audio elements if needed
  useEffect(() => {
    // Create a container for visible audio elements if it doesn't exist
    if (!document.getElementById('audio-container')) {
      const container = document.createElement('div');
      container.id = 'audio-container';
      container.style.position = 'fixed';
      container.style.bottom = '80px';
      container.style.left = '20px';
      container.style.zIndex = '1000';
      container.style.maxWidth = '300px';
      container.style.background = 'rgba(0,0,0,0.7)';
      container.style.borderRadius = '8px';
      container.style.padding = '8px';
      container.style.display = 'none';
      document.body.appendChild(container);
      audioContainerRef.current = container;
    } else {
      audioContainerRef.current = document.getElementById('audio-container');
    }

    return () => {
      // Clean up container on unmount if it's empty
      const container = document.getElementById('audio-container');
      if (container && container.childNodes.length === 0) {
        document.body.removeChild(container);
      }
    };
  }, []);

  // Load legends
  useEffect(() => {
    try {
      const savedLegends = localStorage.getItem('ai-dungeon-master-legends');
      if (savedLegends) {
        const parsedLegends = JSON.parse(savedLegends);
        setLegends(parsedLegends);
        legendsRef.current = parsedLegends;
      }
    } catch (error) {
      console.error('Failed to load legends:', error);
    }
  }, []);

  // Generate suggested actions based on context
  useEffect(() => {
    if (gameState.storyHistory.length > 0) {
      const latestDmEntry = [...gameState.storyHistory]
        .filter(entry => entry.type === 'dm')
        .pop();
      
      if (latestDmEntry) {
        // Extract context from the latest DM entry
        const content = latestDmEntry.content.toLowerCase();
        
        // Get active quest and current milestone
        const activeQuest = gameState.questProgress.find(q => !q.isCompleted && q.isMainQuest);
        const activeSideQuest = gameState.sideQuests?.find(q => !q.isCompleted);
        
        // Generate contextual suggestions
        const newSuggestions: string[] = [];
        
        // First priority: Quest-related actions
        if (activeQuest && activeQuest.milestones && activeQuest.currentMilestoneIndex < activeQuest.milestones.length) {
          const currentMilestone = activeQuest.milestones[activeQuest.currentMilestoneIndex];
          if (currentMilestone && !currentMilestone.isCompleted) {
            // Add quest-specific suggestion based on current milestone
            newSuggestions.push(`${currentMilestone.description}`);
            
            // Add hint if available
            if (currentMilestone.completionHint) {
              newSuggestions.push(currentMilestone.completionHint);
            }
          }
        }
        
        // Second priority: Side quest actions
        if (activeSideQuest && activeSideQuest.milestones && activeSideQuest.currentMilestoneIndex !== undefined) {
          const currentSideMilestone = activeSideQuest.milestones[activeSideQuest.currentMilestoneIndex];
          if (currentSideMilestone && !currentSideMilestone.isCompleted && newSuggestions.length < 3) {
            newSuggestions.push(`${currentSideMilestone.description}`);
          }
        }
        
        // Third priority: Context-based suggestions
        if (newSuggestions.length < 3) {
          // Check for NPCs or characters to interact with
          if (content.includes('elder') || content.includes('guard') || content.includes('merchant') || 
              content.includes('villager') || content.includes('innkeeper')) {
            newSuggestions.push("Talk to the person");
          }
          
          // Check for items or objects to interact with
          if (content.includes('chest') || content.includes('box') || content.includes('container')) {
            newSuggestions.push("Open the chest");
            newSuggestions.push("Examine the chest for traps");
          }
          
          if (content.includes('door') || content.includes('gate')) {
            newSuggestions.push("Open the door");
            newSuggestions.push("Listen at the door");
          }
          
          // Check for combat situations
          if (content.includes('monster') || content.includes('enemy') || content.includes('creature') || 
              content.includes('goblin') || content.includes('orc') || content.includes('dragon')) {
            newSuggestions.push("Attack with my weapon");
            newSuggestions.push("Cast a spell");
            newSuggestions.push("Try to sneak past");
          }
          
          // Check for exploration opportunities
          if (content.includes('path') || content.includes('trail') || content.includes('road')) {
            newSuggestions.push("Follow the path");
          }
          
          if (content.includes('forest') || content.includes('cave') || content.includes('ruins')) {
            newSuggestions.push("Explore the area");
            newSuggestions.push("Search for hidden items");
          }
        }
        
        // Add some generic actions if we don't have enough context-specific ones
        if (newSuggestions.length < 3) {
          const genericActions = [
            "Look around carefully",
            "Check my inventory",
            "Rest for a while",
            "Draw my weapon",
            "Cast a light spell",
            "Call out for help"
          ];
          
          // Add generic actions until we have at least 3 suggestions
          while (newSuggestions.length < 3 && genericActions.length > 0) {
            const action = genericActions.shift();
            if (action) newSuggestions.push(action);
          }
        }
        
        // Limit to 3 suggestions
        setSuggestedActions(newSuggestions.slice(0, 3));
      }
    } else if (gameState.storyPreset) {
      // Use preset suggested actions for new games
      setSuggestedActions(gameState.storyPreset.suggestedActions.slice(0, 3));
    }
  }, [gameState.storyHistory, gameState.storyPreset, gameState.questProgress, gameState.sideQuests]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerInput.trim() && !gameState.isLoading && !gameState.diceRollPending) {
      onPlayerAction(playerInput.trim());
      setPlayerInput('');
    }
  };

  // Handle suggested action click
  const handleSuggestedAction = (action: string) => {
    if (!gameState.isLoading && !gameState.diceRollPending) {
      onPlayerAction(action);
    }
  };

  // FIXED: Only auto-show scene modal when voice starts playing AND we have content AND it's not the first load
  useEffect(() => {
    const latestDMEntry = gameState.storyHistory
      .filter(entry => entry.type === 'dm')
      .pop();

    // Only show modal if:
    // 1. Voice is actually playing
    // 2. We have an image or loading state
    // 3. This is a new voice entry (not the same one)
    // 4. We have story history (not initial load)
    if (latestDMEntry && 
        latestDMEntry.isPlaying && 
        latestDMEntry.id !== lastVoiceEntry &&
        (currentSceneImage || isSceneLoading) &&
        gameState.storyHistory.length > 1) { // FIXED: Don't auto-show on first story entry
      setLastVoiceEntry(latestDMEntry.id);
      setShowSceneModal(true);
    }
  }, [gameState.storyHistory, currentSceneImage, isSceneLoading, lastVoiceEntry]);

  const handleSettingsClick = () => {
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    const elevenlabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
    
    const message = `⚙️ API Configuration\n\n` +
      `OpenAI API Key: ${openaiKey ? '✅ Configured' : '❌ Missing'}\n` +
      `ElevenLabs API Key: ${elevenlabsKey ? '✅ Configured' : '❌ Missing'}\n\n` +
      `Voice Settings:\n` +
      `• Current Voice: Enhanced Narration Voice\n` +
      `• Perfect for dramatic storytelling\n` +
      `• Auto-play can be toggled above\n\n` +
      `To configure your API keys:\n` +
      `1. Create/edit the .env file in your project root\n` +
      `2. Add your keys:\n` +
      `   VITE_OPENAI_API_KEY=your-openai-key\n` +
      `   VITE_ELEVENLABS_API_KEY=your-elevenlabs-key\n` +
      `3. Restart the development server\n\n` +
      `Get API keys from:\n` +
      `• OpenAI: https://platform.openai.com/api-keys\n` +
      `• ElevenLabs: https://elevenlabs.io/`;
    
    alert(message);
  };

  // Show welcome message for new games
  const showWelcomeMessage = gameState.storyHistory.length === 0;

  // Get current room and connected rooms
  const currentRoom = gameState.map.find(room => room.id === gameState.currentLocation);
  
  const connectedRooms = gameState.map.filter(room => 
    currentRoom?.connections.includes(room.id) && 
    gameState.exploredAreas.includes(room.id)
  );
  
  const unexploredConnections = currentRoom 
    ? currentRoom.connections.filter(id => !gameState.exploredAreas.includes(id)).length 
    : 0;

  // Handle story preset selection
  const handleSelectStoryPreset = (preset: any) => {
    if (onSelectStoryPreset) {
      onSelectStoryPreset(preset.id);
    }
    setShowStoryPresetSelector(false);
  };

  // Handle dice roll
  const handleDiceRoll = (result: number, isChaos: boolean = false) => {
    if (onRollDice) {
      onRollDice(result, isChaos);
    }
    
    // Reset dice roll pending state
    if (!isChaos) {
      setTimeout(() => {
        dispatch({ type: 'SET_DICE_ROLL_PENDING', payload: false });
      }, 1000);
    }
  };

  // Handle companion interaction
  const handleCompanionInteraction = (companionId: string, interaction: string) => {
    if (onInteractWithCompanion) {
      onInteractWithCompanion(companionId, interaction);
    }
  };

  // Get active side quests count
  const activeSideQuestsCount = gameState.sideQuests ? 
    gameState.sideQuests.filter(q => !q.isCompleted).length : 0;

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Get active quest and current milestone
  const activeQuest = gameState.questProgress.find(q => !q.isCompleted && q.isMainQuest);
  const currentMilestone = activeQuest?.milestones[activeQuest.currentMilestoneIndex];

  // Handle side quest completion
  const handleCompleteSideQuest = (questId: string) => {
    if (completeSideQuest) {
      completeSideQuest(questId);
    }
  };

  return (
    <div className="min-h-screen bg-black text-amber-50 relative">
      {/* Story Preset Selector */}
      {showStoryPresetSelector && (
        <StoryPresetSelector
          onSelectPreset={handleSelectStoryPreset}
          onCancel={() => setShowStoryPresetSelector(false)}
        />
      )}

      {/* World Memory Log */}
      {showWorldMemory && (
        <WorldMemoryLog
          worldMemory={gameState.worldMemory}
          onClose={() => setShowWorldMemory(false)}
        />
      )}

      {/* Hall of Legends */}
      {showHallOfLegends && (
        <HallOfLegends
          legends={legends}
          onClose={() => setShowHallOfLegends(false)}
        />
      )}

      {/* Side Quests Log */}
      {showSideQuestsLog && gameState.sideQuests && (
        <SideQuestsLog
          quests={gameState.sideQuests}
          onClose={() => setShowSideQuestsLog(false)}
          onUpdateQuest={(questId, updates) => {
            if (updates.progress !== undefined) {
              // Update side quest progress
              dispatch({
                type: 'UPDATE_SIDE_QUEST',
                payload: { id: questId, ...updates }
              });
            }
          }}
          onCompleteQuest={handleCompleteSideQuest}
        />
      )}

      {/* Story Card Display */}
      {gameState.activeStoryCard && (
        <StoryCardDisplay
          card={gameState.activeStoryCard}
          onClose={() => discardStoryCard && discardStoryCard(gameState.activeStoryCard!.id)}
          onReveal={() => {
            // Mark card as revealed in state
            dispatch({ type: 'DISCARD_STORY_CARD', payload: gameState.activeStoryCard!.id });
          }}
          isRevealing={!gameState.activeStoryCard.isRevealed}
        />
      )}

      {/* Level Up Effect */}
      {gameState.hasLeveledUp && (
        <LevelUpEffect 
          level={gameState.level} 
          onComplete={onClearLevelUp}
        />
      )}

      {/* Scene Image Modal - FIXED: Only show when explicitly opened */}
      <SceneImageModal
        isOpen={showSceneModal}
        imageUrl={currentSceneImage}
        isLoading={isSceneLoading}
        onClose={() => setShowSceneModal(false)}
        autoShow={false}
      />

      {/* Floating Header Controls */}
      <div className="fixed top-4 left-4 right-4 z-30 flex items-center justify-between">
        {/* Left Controls */}
        <div className="flex items-center space-x-2">
          <div className="bg-black/80 backdrop-blur-sm border border-amber-600/50 rounded-lg px-4 py-2 shadow-lg">
            <h1 className="fantasy-title text-xl font-bold text-amber-300 glow-text">
              Tavern of Tales
            </h1>
          </div>
          
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="bg-black/80 backdrop-blur-sm border border-amber-600/50 rounded-lg p-2 text-amber-300 hover:text-amber-200 transition-colors shadow-lg"
              title="Back to tavern"
            >
              <Home className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2">
          {/* Side Quests Button */}
          {activeSideQuestsCount > 0 && (
            <button
              onClick={() => setShowSideQuestsLog(true)}
              className="bg-black/80 backdrop-blur-sm border border-amber-600/50 rounded-lg p-2 text-amber-300 hover:text-amber-200 transition-colors shadow-lg relative"
              title="Side Quests"
            >
              <Compass className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
                {activeSideQuestsCount}
              </span>
            </button>
          )}

          {/* Hall of Legends Button */}
          <button
            onClick={() => setShowHallOfLegends(true)}
            className="bg-black/80 backdrop-blur-sm border border-amber-600/50 rounded-lg p-2 text-amber-300 hover:text-amber-200 transition-colors shadow-lg"
            title="Hall of Legends"
          >
            <Trophy className="w-5 h-5" />
          </button>

          {/* World Memory Button */}
          <button
            onClick={() => setShowWorldMemory(true)}
            className="bg-black/80 backdrop-blur-sm border border-amber-600/50 rounded-lg p-2 text-amber-300 hover:text-amber-200 transition-colors shadow-lg"
            title="World Memory"
          >
            <BookOpen className="w-5 h-5" />
          </button>

          {/* Scene Vision Button - FIXED: Only show when we have content AND story history */}
          {(currentSceneImage || isSceneLoading) && gameState.storyHistory.length > 0 && (
            <button
              onClick={() => setShowSceneModal(true)}
              className="bg-black/80 backdrop-blur-sm border border-amber-600/50 rounded-lg p-2 text-amber-300 hover:text-amber-200 transition-colors shadow-lg"
              title="View scene vision"
            >
              <Eye className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onToggleAutoPlay}
            className={`bg-black/80 backdrop-blur-sm border border-amber-600/50 rounded-lg p-2 transition-colors shadow-lg ${
              gameState.autoPlayVoice
                ? 'text-amber-300'
                : 'text-amber-500'
            }`}
            title={gameState.autoPlayVoice ? 'Auto-narration enabled' : 'Auto-narration disabled'}
          >
            {gameState.autoPlayVoice ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="bg-black/80 backdrop-blur-sm border border-amber-600/50 rounded-lg p-2 text-amber-300 hover:text-amber-200 transition-colors shadow-lg"
            title="Toggle character info"
          >
            <User className="w-5 h-5" />
          </button>

          <button
            onClick={handleSettingsClick}
            className="bg-black/80 backdrop-blur-sm border border-amber-600/50 rounded-lg p-2 text-amber-300 hover:text-amber-200 transition-colors shadow-lg"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sliding Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-black/95 backdrop-blur-sm border-l border-amber-600/30 z-40 transform transition-transform duration-300 ${
        showSidebar ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-4 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="fantasy-title text-lg text-amber-300">Character</h2>
            <button
              onClick={() => setShowSidebar(false)}
              className="text-amber-400 hover:text-amber-300"
            >
              ×
            </button>
          </div>
          
          {/* Character Info */}
          <div className="mb-4">
            <button
              onClick={onShowCharacterSheet}
              className="w-full p-3 bg-amber-900/20 border border-amber-600/30 rounded-lg text-left hover:bg-amber-900/30 transition-colors"
            >
              <div className="font-bold text-amber-300">{character.name}</div>
              <div className="text-sm text-amber-400">Level {character.level} {character.class.name}</div>
              <div className="text-xs text-amber-500 mt-1">Click to view full character sheet</div>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-2 bg-red-900/20 border border-red-600/30 rounded-lg">
              <div className="text-red-300 font-medium text-sm">Health</div>
              <div className="text-red-100 font-bold">{character.hitPoints}/{character.maxHitPoints}</div>
            </div>
            <div className="text-center p-2 bg-blue-900/20 border border-blue-600/30 rounded-lg">
              <div className="text-blue-300 font-medium text-sm">Armor</div>
              <div className="text-blue-100 font-bold">{character.armorClass}</div>
            </div>
          </div>

          {/* Active Quest Section */}
          {activeQuest && currentMilestone && (
            <div className="mb-4">
              <h3 className="fantasy-title text-sm text-amber-300 mb-2">Active Quest</h3>
              <div className="p-3 bg-amber-900/20 border border-amber-600/30 rounded-lg">
                <div className="text-amber-300 font-medium">{activeQuest.name}</div>
                <div className="text-xs text-amber-200 mt-1 mb-2">{activeQuest.description}</div>
                
                <div className="text-xs text-amber-400 font-medium mb-1">Current Objective:</div>
                <div className="text-sm text-amber-100 p-2 bg-amber-900/30 border-l-2 border-amber-500 rounded-r-lg mb-2">
                  {currentMilestone.description}
                </div>
                
                {currentMilestone.completionHint && (
                  <div className="text-xs text-amber-400 italic">
                    Hint: {currentMilestone.completionHint}
                  </div>
                )}
                
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-amber-400 mb-1">
                    <span>Progress</span>
                    <span>{Math.round((activeQuest.progress / activeQuest.maxProgress) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-700 rounded-full">
                    <div 
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${(activeQuest.progress / activeQuest.maxProgress) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Companions Section */}
          {gameState.companions.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="fantasy-title text-sm text-amber-300">Companions</h3>
                <button
                  onClick={() => setShowCompanions(!showCompanions)}
                  className="text-xs text-amber-400 hover:text-amber-300"
                >
                  {showCompanions ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showCompanions && (
                <div className="space-y-2">
                  {gameState.companions.map(companion => (
                    <CompanionDisplay
                      key={companion.id}
                      companion={companion}
                      isMinimized={true}
                      onDismiss={onDismissCompanion ? () => onDismissCompanion(companion.id) : undefined}
                      onInteract={onInteractWithCompanion ? (interaction) => handleCompanionInteraction(companion.id, interaction) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Side Quests Section */}
          {gameState.sideQuests && gameState.sideQuests.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="fantasy-title text-sm text-amber-300">Side Quests</h3>
                <span className="text-xs text-amber-400">
                  {gameState.sideQuests.filter(q => !q.isCompleted).length} active
                </span>
              </div>
              
              <div className="space-y-2">
                {gameState.sideQuests
                  .filter(q => !q.isCompleted)
                  .slice(0, 3)
                  .map(quest => (
                    <div 
                      key={quest.id}
                      className="p-2 bg-amber-900/10 border border-amber-600/30 rounded-lg cursor-pointer hover:bg-amber-900/20"
                      onClick={() => setShowSideQuestsLog(true)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-amber-300 font-medium">{quest.title}</div>
                        <div className="text-xs text-amber-400">
                          {Math.round((quest.progress / quest.maxProgress) * 100)}%
                        </div>
                      </div>
                      <div className="w-full h-1 bg-gray-700 rounded-full mt-1">
                        <div 
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${(quest.progress / quest.maxProgress) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                
                {gameState.sideQuests.filter(q => !q.isCompleted).length > 3 && (
                  <div className="text-center text-xs text-amber-400 py-1">
                    +{gameState.sideQuests.filter(q => !q.isCompleted).length - 3} more quests
                  </div>
                )}
                
                {gameState.sideQuests.filter(q => q.isCompleted).length > 0 && (
                  <div className="text-center text-xs text-green-400 py-1">
                    {gameState.sideQuests.filter(q => q.isCompleted).length} completed
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Minimap */}
          {showMinimap && minimap && (
            <div className="mb-4">
              {minimap}
            </div>
          )}

          {/* Dice Section */}
          <div className="mb-4">
            <h3 className="fantasy-title text-sm text-amber-300 mb-2">Dice</h3>
            <div className="flex justify-around">
              <DiceRoller
                isEnabled={gameState.diceRollPending}
                onRoll={handleDiceRoll}
                diceType="d20"
              />
              
              <DiceRoller
                isEnabled={gameState.chaosDiceAvailable}
                onRoll={(result) => handleDiceRoll(result, true)}
                diceType="d20"
                isChaos={true}
              />
            </div>
          </div>

          {/* Story Cards */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="fantasy-title text-sm text-amber-300">Story Cards</h3>
              <button
                onClick={onDrawStoryCard}
                disabled={gameState.activeStoryCard !== null || gameState.isLoading}
                className="text-xs px-2 py-1 bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 rounded text-black transition-colors"
              >
                Draw Card
              </button>
            </div>
            
            <div className="bg-gray-900/50 border border-amber-600/30 rounded-lg p-2 text-center">
              {gameState.storyCards.filter(card => card.isRevealed).length} cards revealed
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <button
              onClick={() => setShowStoryPresetSelector(true)}
              className="w-full p-2 bg-amber-900/20 border border-amber-600/30 rounded-lg text-amber-300 hover:bg-amber-900/30 transition-colors text-sm"
            >
              <BookOpen className="w-4 h-4 inline mr-2" />
              Change Story Preset
            </button>
            
            <button
              onClick={onShowSessionManager}
              className="w-full p-2 bg-amber-900/20 border border-amber-600/30 rounded-lg text-amber-300 hover:bg-amber-900/30 transition-colors text-sm"
            >
              <Users className="w-4 h-4 inline mr-2" />
              Shared Stories
            </button>
          </div>
        </div>
      </div>

      {/* Journal Log - Left Side */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-black/95 backdrop-blur-sm border-r border-amber-600/30 z-30 transform transition-transform duration-300 ${
        showJournal ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <JournalLog 
          entries={gameState.storyHistory}
          onToggleVoice={onToggleVoice}
          autoPlayVoice={gameState.autoPlayVoice}
          onClose={() => setShowJournal(false)}
        />
      </div>

      {/* Main Game Interface - Adjusted for Journal */}
      <div className={`transition-all duration-300 ${showJournal ? 'ml-72' : ''}`}>
        {/* Toggle Journal Button */}
        <button
          onClick={() => setShowJournal(!showJournal)}
          className={`fixed top-20 left-0 z-20 bg-amber-900/80 backdrop-blur-sm border-y border-r border-amber-600/50 rounded-r-lg p-2 text-amber-300 hover:text-amber-200 transition-colors shadow-lg ${
            showJournal ? 'left-72' : 'left-0'
          }`}
          title={showJournal ? "Hide journal" : "Show journal"}
        >
          <BookOpen className={`w-5 h-5 transition-transform ${showJournal ? 'rotate-180' : 'rotate-0'}`} />
        </button>

        {/* Main Game Layout - With Quest Panel */}
        <div className="pt-16 pb-20 px-4 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Main Content Area - 3 columns */}
            <div className="lg:col-span-3">
              {/* Scene Image - SMALLER SIZE */}
              {!showWelcomeMessage && gameState.storyHistory.length > 0 && (currentSceneImage || isSceneLoading) && (
                <div className="mb-4">
                  <div className="scene-image-container-small relative">
                    <SceneImage 
                      imageUrl={currentSceneImage}
                      isLoading={isSceneLoading}
                      alt="Current scene"
                    />
                    
                    {/* Click to expand overlay */}
                    <div 
                      className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                      onClick={() => setShowSceneModal(true)}
                    >
                      <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 text-amber-300">
                        <Eye className="w-5 h-5 inline mr-2" />
                        View Full Scene
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Companions Display */}
              {gameState.companions.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {gameState.companions.map(companion => (
                    <div key={companion.id} className="w-full">
                      <CompanionDisplay
                        companion={companion}
                        isMinimized={true}
                        onInteract={onInteractWithCompanion ? (interaction) => handleCompanionInteraction(companion.id, interaction) : undefined}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Active Quest Banner */}
              {activeQuest && currentMilestone && !showWelcomeMessage && (
                <div className="mb-4 p-3 bg-amber-900/20 border border-amber-600/40 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="mr-3 p-2 bg-amber-900/40 rounded-full">
                        <Scroll className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-amber-300 font-medium text-sm">Current Quest: {activeQuest.name}</h3>
                        <p className="text-amber-200 text-xs">{currentMilestone.description}</p>
                      </div>
                    </div>
                    <div className="text-xs text-amber-400">
                      {Math.round((activeQuest.progress / activeQuest.maxProgress) * 100)}%
                    </div>
                  </div>
                  <div className="w-full h-1 bg-gray-700 rounded-full mt-2">
                    <div 
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${(activeQuest.progress / activeQuest.maxProgress) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Story Book - SMALLER SIZE - Now only shows current DM response */}
              <div className="book-container-small">
                {showWelcomeMessage ? (
                  <div className="book-page-small p-6 text-center">
                    <div className="mb-4">
                      <BookOpen className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                      <h2 className="fantasy-title text-2xl text-amber-300 mb-3">
                        Welcome to the Tavern, {character.name}
                      </h2>
                    </div>
                    
                    <div className="prose prose-amber max-w-none">
                      <p className="text-amber-200 text-base mb-4 leading-relaxed">
                        Your tale as a {character.class.name} begins now. Choose a story preset to start your adventure, or create your own path.
                      </p>
                      <p className="text-amber-300 text-sm mb-4">
                        Each preset offers a unique setting and tone for your adventure. You can also draw Story Cards to add unexpected twists to your tale.
                      </p>
                      
                      <div className="flex justify-center space-x-4 mb-4">
                        <button
                          onClick={() => setShowStoryPresetSelector(true)}
                          className="px-4 py-2 rune-button rounded-lg text-black"
                        >
                          <BookOpen className="w-4 h-4 inline mr-2" />
                          Choose Story Preset
                        </button>
                        
                        <button
                          onClick={onDrawStoryCard}
                          className="px-4 py-2 bg-purple-700 hover:bg-purple-600 border border-purple-500 rounded-lg text-white transition-colors"
                        >
                          <Sparkles className="w-4 h-4 inline mr-2" />
                          Draw Story Card
                        </button>
                      </div>
                      
                      {(!import.meta.env.VITE_OPENAI_API_KEY) && (
                        <div className="mt-4 p-3 bg-amber-900/30 border border-amber-600 rounded-lg">
                          <p className="text-amber-200 text-xs">
                            ⚠️ <strong>Setup Required:</strong> Configure your OpenAI API key to begin your tale. 
                            Click the settings button for instructions.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="book-page-small p-5">
                    <div className="flex items-center justify-center mb-4">
                      <Scroll className="w-5 h-5 text-amber-400 mr-2" />
                      <h2 className="fantasy-title text-lg text-amber-300">
                        The Storyteller Speaks
                      </h2>
                      
                      {/* Reroll Story Button */}
                      {onRerollStory && !isStreaming && !gameState.isLoading && (
                        <button
                          onClick={onRerollStory}
                          className="ml-2 p-1 text-amber-400 hover:text-amber-300 transition-colors"
                          title="Reroll this response"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="story-content">
                      {/* Only show the latest DM entry in the main window */}
                      {gameState.storyHistory.length > 0 && (() => {
                        // Find the latest DM entry
                        const latestDmEntry = [...gameState.storyHistory]
                          .filter(entry => entry.type === 'dm')
                          .pop();
                        
                        if (latestDmEntry) {
                          return (
                            <div className="scroll-appear">
                              <div className="flex items-start space-x-3">
                                <div className="flex-1 min-w-0">
                                  <div className="text-amber-100 bg-amber-900/10 border-l-4 border-amber-400 pl-3 py-2 rounded-r-lg">
                                    {isStreaming ? (
                                      <TypewriterText
                                        text={streamingText}
                                        speed={30}
                                        startDelay={0}
                                      />
                                    ) : (
                                      latestDmEntry.content.split('\n').map((paragraph, pIndex) => (
                                        <p key={pIndex} className="mb-1 last:mb-0 leading-relaxed text-base">
                                          {paragraph}
                                        </p>
                                      ))
                                    )}
                                  </div>
                                  
                                  {/* Voice control */}
                                  {latestDmEntry.voiceUrl && !isStreaming && (
                                    <div className="mt-2 flex justify-end">
                                      <button
                                        onClick={() => onToggleVoice(latestDmEntry.id, !latestDmEntry.isPlaying)}
                                        className={`px-3 py-1 rounded-full text-xs flex items-center space-x-1 ${
                                          latestDmEntry.isPlaying 
                                            ? 'bg-amber-600/30 text-amber-300 animate-pulse' 
                                            : 'bg-amber-900/20 text-amber-400 hover:bg-amber-900/30'
                                        }`}
                                      >
                                        <Volume2 className="w-3 h-3 mr-1" />
                                        {latestDmEntry.isPlaying ? 'Listening...' : 'Listen'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="text-center py-6 text-amber-400">
                            The storyteller awaits your first action...
                          </div>
                        );
                      })()}
                      
                      {/* Show loading placeholder when generating response */}
                      {(loadingStates.text || loadingStates.voice) && !isStreaming && (
                        <div className="mt-4">
                          <LoadingPlaceholder
                            isGeneratingText={loadingStates.text}
                            isGeneratingVoice={loadingStates.voice}
                            isGeneratingImage={loadingStates.image}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Suggested Actions */}
              {!showWelcomeMessage && suggestedActions.length > 0 && !gameState.isLoading && !gameState.diceRollPending && !isStreaming && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {suggestedActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedAction(action)}
                      className="px-4 py-2 bg-amber-900/30 border border-amber-600/50 rounded-lg text-amber-300 hover:bg-amber-900/50 hover:border-amber-500 transition-all duration-200 text-sm"
                    >
                      🔹 {action}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quest Log Panel - 1 column */}
            <div className="lg:col-span-1">
              <QuestLogPanel 
                quests={gameState.questProgress}
                currentLocation={currentRoom?.name}
                locationDescription={currentRoom?.description}
                currentConnections={{
                  connectedRooms,
                  unexploredConnections
                }}
                onQuestClick={(questId) => {
                  // Highlight the quest when clicked
                  console.log('Quest clicked:', questId);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Game Interaction Area - Moved outside the main layout to avoid overlap */}
      <div className="fixed bottom-0 left-0 right-0 z-30">
        {/* Dice Roller - Only shown when a roll is pending */}
        {gameState.diceRollPending && (
          <div className="mb-4 flex justify-center">
            <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 text-center">
              <h3 className="fantasy-title text-amber-300 mb-2">Roll Required</h3>
              <p className="text-amber-200 text-sm mb-3">The storyteller awaits your dice roll...</p>
              <div className="flex justify-center">
                <DiceRoller
                  isEnabled={true}
                  onRoll={handleDiceRoll}
                  diceType="d20"
                />
              </div>
            </div>
          </div>
        )}

        {/* Chaos Dice - Only shown when available */}
        {gameState.chaosDiceAvailable && (
          <div className="mb-4 flex justify-center">
            <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4 text-center">
              <h3 className="fantasy-title text-purple-300 mb-2">Chaos Beckons</h3>
              <p className="text-purple-200 text-sm mb-3">The fabric of reality seems thin... Roll the Chaos Dice?</p>
              <div className="flex justify-center">
                <DiceRoller
                  isEnabled={true}
                  onRoll={(result) => handleDiceRoll(result, true)}
                  diceType="d20"
                  isChaos={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Fixed Bottom Input - SMALLER SIZE */}
        <div className="bg-black/95 backdrop-blur-sm border-t border-amber-600/30 p-3">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={playerInput}
                  onChange={(e) => setPlayerInput(e.target.value)}
                  placeholder={showWelcomeMessage 
                    ? `Begin your tale as ${character.name}... (e.g., 'I light my torch and step forward')`
                    : currentMilestone
                    ? `Current objective: ${currentMilestone.description}`
                    : "What do you do next? (e.g., 'Search the ancient chest' or 'Cast a light spell')"
                  }
                  disabled={gameState.isLoading || gameState.diceRollPending || isStreaming}
                  className="w-full p-3 pr-12 spell-input rounded-lg text-amber-50 placeholder-amber-300 font-medium text-base focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!playerInput.trim() || gameState.isLoading || gameState.diceRollPending || isStreaming}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 rune-button px-3 py-2 rounded-lg font-bold text-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {gameState.isLoading || isStreaming ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              <div className="text-center">
                <button
                  type="submit"
                  disabled={!playerInput.trim() || gameState.isLoading || gameState.diceRollPending || isStreaming}
                  className="rune-button px-6 py-2 rounded-lg font-bold text-black text-base disabled:opacity-50 disabled:cursor-not-allowed fantasy-title"
                >
                  {gameState.diceRollPending 
                    ? 'Roll the dice first!' 
                    : isStreaming
                    ? 'The story unfolds...'
                    : gameState.isLoading 
                    ? 'Weaving Your Tale...' 
                    : 'Continue Your Story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Overlay when sidebar is open */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Custom styles for smaller components */}
      <style jsx="true">{`
        .scene-image-container-small {
          height: 180px;
          max-height: 180px;
          min-height: 120px;
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid rgba(251, 191, 36, 0.5);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
        }
        
        .book-container-small {
          perspective: 1000px;
          margin: 0 auto;
          max-width: 100%;
        }
        
        .book-page-small {
          background: linear-gradient(135deg, 
            rgba(139, 116, 87, 0.25) 0%, 
            rgba(101, 67, 33, 0.20) 50%,
            rgba(139, 116, 87, 0.25) 100%
          );
          border: 2px solid rgba(251, 191, 36, 0.4);
          border-radius: 12px;
          box-shadow: 
            0 8px 20px rgba(0, 0, 0, 0.5),
            0 0 30px rgba(251, 191, 36, 0.2),
            inset 0 0 20px rgba(139, 116, 87, 0.1);
          backdrop-filter: blur(15px);
          position: relative;
          height: 220px;
          max-height: 220px;
          min-height: 180px;
          overflow-y: auto;
          transform: rotateX(1deg);
          transition: all 0.3s ease;
        }
        
        .book-page-small:hover {
          transform: rotateX(0deg);
        }
        
        @media (max-width: 768px) {
          .scene-image-container-small {
            height: 150px;
            min-height: 100px;
          }
          
          .book-page-small {
            height: 220px;
            min-height: 180px;
          }
        }
      `}</style>
    </div>
  );
}