import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FloatingEmbers } from './components/FloatingEmbers';
import { BackgroundMusic } from './components/BackgroundMusic';
import { Multiplayer3DApp } from './components/Multiplayer/Multiplayer3DApp';
import { SinglePlayerGameFlow } from './components/SinglePlayerGameFlow';
import { CharacterManagement3D } from './components/CharacterManagement3D';
import { useGameState } from './hooks/useGameState';
import { useCharacter } from './hooks/useCharacter';
import { useAuth } from './hooks/useAuth';
import { OpenAIService } from './services/openai';
import { ElevenLabsService } from './services/elevenlabs';
import { DalleService } from './services/dalle';
import { Character, InventoryItem, EquipmentSlots } from './types/character';
import { getStoryPresetById } from './data/storyPresets';
import { getRandomStoryCard, getRandomStoryCardByType } from './data/storyCards';
import { SideQuest } from './types/game';
import { useCharacterStore } from './stores/characterStore';
import { supabase } from './lib/supabase';
import { User, LogOut, Settings, UserPlus } from 'lucide-react';
import { UserProfileModal } from './components/UserProfileModal';
import { TavernBackground } from './components/TavernBackground';
import { AuthModal } from './components/Auth/AuthModal';

// Default scene image for the beginning of the adventure
const DEFAULT_SCENE_IMAGE = 'https://images.pexels.com/photos/161235/pexels-photo-161235.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';

// Enhanced logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[APP INFO] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[APP ERROR] ${message}`, error || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[APP WARN] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    console.log(`[APP DEBUG] ${message}`, data || '');
  }
};

// Make OpenAI service available globally for character creation
declare global {
  interface Window {
    openaiService?: OpenAIService;
  }
}

function App() {
  // Primary app state - using more explicit state management
  const [gameMode, setGameMode] = useState<'single' | 'multiplayer' | null>(null);
  const [uiState, setUiState] = useState<'home' | 'character-creation' | 'character-sheet' | 'game'>('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [previousUiState, setPreviousUiState] = useState<'home' | 'character-creation' | 'character-sheet' | 'game' | null>(null);
  
  const { 
    state: gameState, 
    dispatch, 
    gainXP, 
    makeDeathSave,
    updateQuest,
    hasSavedGame, 
    useItem, 
    addItem,
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
  } = useGameState();
  
  const {
    character,
    isLoading: isCharacterLoading,
    saveCharacter,
    updateCharacter,
    clearCharacter,
    hasCharacter,
    gainExperience,
    takeDamage,
    healCharacter,
    useLuck,
    grantInspiration,
    useInspiration,
    addCondition,
    longRest,
    shortRest,
    equipItem,
    unequipItem,
    useConsumableItem
  } = useCharacter();
  
  const { user, profile, loading: authLoading, error: authError, signIn, signUp, signOut } = useAuth();
  
  const [currentSceneImage, setCurrentSceneImage] = useState<string>(() => {
    const savedImage = getSavedSceneImage();
    return savedImage || DEFAULT_SCENE_IMAGE;
  });
  
  const [isSceneLoading, setIsSceneLoading] = useState(false);
  const [hasCheckedCharacter, setHasCheckedCharacter] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    text: false,
    voice: false,
    image: false
  });
  const [showMinimap, setShowMinimap] = useState(true);

  // Initialize services
  const openaiService = new OpenAIService('');
  const elevenlabsService = new ElevenLabsService('');
  const dalleService = new DalleService('');

  // Make OpenAI service available globally for character creation
  useEffect(() => {
    window.openaiService = openaiService;
    return () => {
      delete window.openaiService;
    };
  }, [openaiService]);

  // Check if user is admin
  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      // Check if user has admin privileges by checking if they're in the admin_users table
      // instead of looking for a role column that doesn't exist
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking admin status:', error);
        return;
      }
      
      // If user exists in admin_users table, they're an admin
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  // Check admin status on mount
  useEffect(() => {
    checkAdminStatus();
  }, []);

  // Enhanced logging for component state changes
  useEffect(() => {
    logger.info('App component mounted', {
      gameMode,
      uiState,
      hasCharacter: hasCharacter(),
      isCharacterLoading
    });
  }, []);

  useEffect(() => {
    logger.debug('Game mode changed', { gameMode, uiState });
  }, [gameMode, uiState]);

  useEffect(() => {
    logger.debug('Character state changed', {
      hasCharacter: hasCharacter(),
      characterName: character?.name,
      isLoading: isCharacterLoading,
      uiState
    });
  }, [character, isCharacterLoading, hasCharacter, uiState]);

  useEffect(() => {
    logger.debug('UI state changed', {
      uiState,
      gameMode,
      hasCheckedCharacter,
      hasCharacter: hasCharacter()
    });
  }, [uiState, gameMode, hasCheckedCharacter, hasCharacter]);

  // Check for character on mount (only for single player)
  useEffect(() => {
    if (gameMode === 'single' && !isCharacterLoading && !hasCheckedCharacter) {
      logger.info('Checking for existing character in single player mode');
      setHasCheckedCharacter(true);
      
      if (!hasCharacter()) {
        logger.info('No character found, showing character creation');
        setUiState('character-creation');
      } else {
        logger.info('Character found, ready to play', { characterName: character?.name });
        setUiState('game');
      }
    }
  }, [gameMode, isCharacterLoading, hasCheckedCharacter, hasCharacter, character]);

  // Update scene image and save to localStorage
  const updateSceneImage = useCallback((imageUrl: string) => {
    logger.debug('Updating scene image', { imageUrl });
    setCurrentSceneImage(imageUrl);
    saveSceneImage(imageUrl);
  }, [saveSceneImage]);

  const handleCharacterCreated = useCallback(async (newCharacter: Character) => {
    logger.info('Character created', { characterName: newCharacter.name, characterClass: newCharacter.class.name });
    
    // FIXED: Reset game state when creating new character
    dispatch({ type: 'RESET_GAME' });
    clearSavedSceneImage();
    setCurrentSceneImage(DEFAULT_SCENE_IMAGE);
    
    saveCharacter(newCharacter);
    setUiState('game');
  }, [saveCharacter, dispatch, clearSavedSceneImage]);

  const handleNewAdventure = useCallback(() => {
    logger.info('Starting new adventure');
    dispatch({ type: 'RESET_GAME' });
    clearCharacter();
    clearSavedSceneImage();
    setCurrentSceneImage(DEFAULT_SCENE_IMAGE);
    setUiState('character-creation');
  }, [dispatch, clearCharacter, clearSavedSceneImage]);

  const handleSwitchMode = useCallback(() => {
    logger.info('Switching to multiplayer mode');
    setGameMode('multiplayer');
    setUiState('home');
  }, []);

  const handleBackToHome = useCallback(() => {
    logger.info('Returning to home screen');
    setGameMode(null);
    setUiState('home');
  }, []);

  // Enhanced button handlers with immediate state updates and better logging
  const handleCreateNewCharacter = useCallback(() => {
    logger.info('Create new character button clicked - FORCING UI UPDATE');
    // FIXED: Reset game when creating new character
    dispatch({ type: 'RESET_GAME' });
    clearSavedSceneImage();
    setCurrentSceneImage(DEFAULT_SCENE_IMAGE);
    setUiState('character-creation');
  }, [dispatch, clearSavedSceneImage]);

  const handleViewCharacter = useCallback((selectedCharacter?: Character) => {
    logger.info('View character button clicked - FORCING UI UPDATE', { 
      character: selectedCharacter?.name || character?.name, 
      hasChar: hasCharacter() 
    });
    
    // Save the previous UI state before changing to character sheet
    setPreviousUiState(uiState);
    
    if (selectedCharacter || (character && hasCharacter())) {
      if (selectedCharacter && selectedCharacter !== character) {
        // If a specific character was selected, use that one
        saveCharacter(selectedCharacter);
      }
      
      logger.debug('Character exists, FORCING character sheet display');
      setUiState('character-sheet');
    } else {
      logger.warn('No character to view, FORCING character creation instead');
      setUiState('character-creation');
    }
  }, [character, hasCharacter, uiState, saveCharacter]);

  const handleSoloAdventure = useCallback(() => {
    logger.info('Solo adventure button clicked - FORCING UI UPDATE');
    
    if (!hasCharacter()) {
      logger.info('No character found, FORCING character creation first');
      setUiState('character-creation');
      setGameMode('single');
    } else {
      logger.info('Character found, FORCING solo adventure start', { characterName: character?.name });
      setGameMode('single');
      setUiState('game');
    }
  }, [hasCharacter, character]);

  // Toggle minimap visibility
  const handleToggleMinimap = useCallback(() => {
    setShowMinimap(prev => !prev);
  }, []);

  // Handle closing character sheet
  const handleCloseCharacterSheet = useCallback(() => {
    logger.info('Character sheet closed');
    
    // If we came from the user profile, go back to it
    if (previousUiState === 'home' && showUserProfile) {
      setUiState('home');
    } else if (previousUiState) {
      // Otherwise go back to the previous UI state
      setUiState(previousUiState);
    } else {
      // Default fallback
      setUiState('game');
    }
    
    // Reset the previous UI state
    setPreviousUiState(null);
  }, [previousUiState, showUserProfile]);

  // Handle auth modal interactions
  const handleAuthModalClose = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await signIn(email, password);
      if (!error) {
        setShowAuthModal(false);
      }
      return { error };
    } catch (error) {
      return { error };
    }
  }, [signIn]);

  const handleSignUp = useCallback(async (email: string, password: string, username: string) => {
    try {
      const { error } = await signUp(email, password, username);
      if (!error) {
        setShowAuthModal(false);
      }
      return { error };
    } catch (error) {
      return { error };
    }
  }, [signUp]);

  // CRITICAL FIX: Restructure the rendering logic to prioritize uiState over gameMode
  logger.debug('Current render state', { 
    gameMode, 
    uiState, 
    hasCharacter: hasCharacter(),
    character: character?.name 
  });

  // 1. FIRST PRIORITY: Show multiplayer app if gameMode is multiplayer
  if (gameMode === 'multiplayer') {
    logger.debug('Rendering multiplayer app');
    return (
      <div className="relative">
        {/* GLOBAL BACKGROUND MUSIC - Only rendered here at the top level */}
        <BackgroundMusic volume={0.07} autoPlay={true} />
        <Multiplayer3DApp onBackToHome={handleBackToHome} />
        
        {/* Bolt badge */}
        <div className="fixed bottom-4 right-4 z-50">
          <a href="https://bolt.new" target="_blank" rel="noopener noreferrer">
            <img src="/bolt-badge.png" alt="Built with Bolt" width="96" height="96" />
          </a>
        </div>
      </div>
    );
  }

  // 2. SECOND PRIORITY: Show character creation if uiState is character-creation
  if (uiState === 'character-creation') {
    logger.debug('Rendering character creation screen');
    return (
      <div className="relative">
        <CharacterManagement3D
          mode="creation"
          character={null}
          onCharacterCreated={handleCharacterCreated}
          onClose={() => {
            logger.info('Character creation cancelled');
            setUiState('home');
            setGameMode(null);
          }}
          onBackToHome={handleBackToHome}
        />
        
        {/* Bolt badge */}
        <div className="fixed bottom-4 right-4 z-50">
          <a href="https://bolt.new" target="_blank" rel="noopener noreferrer">
            <img src="/bolt-badge.png" alt="Built with Bolt" width="96" height="96" />
          </a>
        </div>
      </div>
    );
  }

  // 3. THIRD PRIORITY: Show character sheet if uiState is character-sheet
  if (uiState === 'character-sheet' && character) {
    logger.debug('Rendering character sheet modal');
    return (
      <div className="relative">
        <CharacterManagement3D
          mode="sheet"
          character={character}
          onCharacterCreated={() => {}} // Not used in sheet mode
          onClose={handleCloseCharacterSheet}
          onBackToHome={handleBackToHome}
          equipItem={equipItem}
          unequipItem={unequipItem}
          useItem={useConsumableItem}
        />
        
        {/* Bolt badge */}
        <div className="fixed bottom-4 right-4 z-50">
          <a href="https://bolt.new" target="_blank" rel="noopener noreferrer">
            <img src="/bolt-badge.png" alt="Built with Bolt" width="96" height="96" />
          </a>
        </div>
      </div>
    );
  }

  // 4. FOURTH PRIORITY: Show main game interface if uiState is game and we have a character
  if (uiState === 'game' && character) {
    logger.debug('Rendering main game interface');
    return (
      <div className="relative">
        <SinglePlayerGameFlow
          gameState={gameState}
          character={character}
          dispatch={dispatch}
          openaiService={openaiService}
          elevenlabsService={elevenlabsService}
          dalleService={dalleService}
          currentSceneImage={currentSceneImage}
          isSceneLoading={isSceneLoading}
          loadingStates={loadingStates}
          showMinimap={showMinimap}
          onToggleMinimap={handleToggleMinimap}
          onShowCharacterSheet={() => {
            logger.info('Show character sheet requested from game interface');
            setUiState('character-sheet');
          }}
          onShowSessionManager={handleSwitchMode}
          onBackToHome={handleBackToHome}
          onNewAdventure={handleNewAdventure}
          // Game state functions
          gainXP={gainXP}
          makeDeathSave={makeDeathSave}
          updateQuest={updateQuest}
          updateSceneImage={updateSceneImage}
          // Character functions
          takeDamage={takeDamage}
          healCharacter={healCharacter}
          gainExperience={gainExperience}
          grantInspiration={grantInspiration}
          addCondition={addCondition}
          // World memory functions
          addNPC={addNPC}
          recordDecision={recordDecision}
          // Companion functions
          addCompanion={addCompanion}
          updateCompanion={updateCompanion}
          removeCompanion={removeCompanion}
          // Story card functions
          drawStoryCard={drawStoryCard}
          discardStoryCard={discardStoryCard}
          // Map functions
          updateLocation={updateLocation}
          revealArea={revealArea}
          markRoomCompleted={markRoomCompleted}
          // Story functions
          updateStoryProgress={updateStoryProgress}
          setStoryPreset={setStoryPreset}
          // Side quest functions
          addSideQuest={addSideQuest}
          updateSideQuest={updateSideQuest}
          completeSideQuest={completeSideQuest}
        />
        
        {/* Bolt badge */}
        <div className="fixed bottom-4 right-4 z-50">
          <a href="https://bolt.new" target="_blank" rel="noopener noreferrer">
            <img src="/bolt-badge.png" alt="Built with Bolt" width="96" height="96" />
          </a>
        </div>
      </div>
    );
  }

  // 5. FINAL FALLBACK: Show game mode selection screen (home)
  logger.debug('Rendering game mode selection screen (fallback)', { gameMode, uiState });
  
  return (
    <div className="min-h-screen bg-black text-amber-50 flex items-center justify-center relative">
      {/* 3D Tavern Background */}
      <TavernBackground />
      
      <FloatingEmbers />
      <BackgroundMusic volume={0.07} autoPlay={true} />
      
      {/* User Profile Modal */}
      {showUserProfile && user && (
        <UserProfileModal
          user={user}
          profile={profile}
          onClose={() => setShowUserProfile(false)}
          onSignOut={signOut}
          onViewCharacter={handleViewCharacter}
        />
      )}
      
      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={true}
          onClose={handleAuthModalClose}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onSignInWithGoogle={async () => {}}
          loading={authLoading}
          error={authError}
        />
      )}
      
      <div className="parchment-panel p-8 max-w-2xl w-full mx-4 text-center relative z-10">
        {/* User Profile Button */}
        <div className="absolute top-4 right-4 flex items-center space-x-3">
          <button
            onClick={() => user ? setShowUserProfile(true) : setShowAuthModal(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-amber-900/80 border border-amber-600/50 rounded-lg text-amber-300 hover:bg-amber-800/80 transition-colors"
          >
            <User className="w-4 h-4" />
            <span>{user ? (profile?.username || 'User') : 'Guest'}</span>
          </button>
        </div>
        
        <h1 className="fantasy-title text-4xl font-bold text-amber-300 mb-6 glow-text">
          Tavern of Tales
        </h1>
        <p className="text-amber-200 text-lg mb-8">
          Where legends are born and stories unfold
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => {
              logger.info('Solo adventure card clicked - IMMEDIATE ACTION');
              handleSoloAdventure();
            }}
            className="p-6 border-2 border-amber-600/30 rounded-lg hover:border-amber-500 hover:bg-amber-900/20 transition-all duration-300 group hover:scale-105"
          >
            <div className="text-2xl mb-3">📖</div>
            <h3 className="fantasy-title text-xl text-amber-300 mb-2">Solo Tale</h3>
            <p className="text-amber-200 text-sm">
              Craft your own legend with the AI Storyteller as your guide
            </p>
          </button>
          
          <button
            onClick={() => {
              logger.info('Multiplayer session card clicked - IMMEDIATE ACTION');
              if (user) {
                setGameMode('multiplayer');
                setUiState('home');
              } else {
                setShowAuthModal(true);
              }
            }}
            className="p-6 border-2 border-amber-600/30 rounded-lg hover:border-amber-500 hover:bg-amber-900/20 transition-all duration-300 group hover:scale-105"
          >
            <div className="text-2xl mb-3">🍻</div>
            <h3 className="fantasy-title text-xl text-amber-300 mb-2">Shared Stories</h3>
            <p className="text-amber-200 text-sm">
              Join friends around the tavern table for collaborative tales
            </p>
          </button>
        </div>

        {/* Character and New Character Buttons - Enhanced with better styling and logging */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
          {hasCharacter() && character && (
            <button
              onClick={() => {
                logger.info('View character button clicked from home screen - IMMEDIATE ACTION');
                handleViewCharacter();
              }}
              className="inline-flex items-center space-x-3 px-8 py-4 rounded-lg border-2 border-amber-600 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40 hover:border-amber-500 hover:scale-105 transition-all duration-300 font-medium shadow-lg"
            >
              <span className="text-xl">👤</span>
              <div className="text-left">
                <div className="font-bold">View Latest Character</div>
                <div className="text-sm text-amber-400">{character.name} (Lvl {character.level})</div>
              </div>
            </button>
          )}
          
          <button
            onClick={() => {
              logger.info('Create new character button clicked from home screen - IMMEDIATE ACTION');
              handleCreateNewCharacter();
            }}
            className="inline-flex items-center space-x-3 px-8 py-4 rounded-lg border-2 border-amber-600 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40 hover:border-amber-500 hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <span className="text-xl">✨</span>
            <div className="text-left">
              <div className="font-bold">Create New Character</div>
              <div className="text-sm text-amber-400">Start fresh adventure</div>
            </div>
          </button>
        </div>
        
        <div className="text-center mb-6">
          <p className="text-amber-400 text-sm">
            Welcome to the tavern where every tale becomes legend
          </p>
        </div>

        {/* Discord Link */}
        <div className="mt-6 flex justify-center">
          <a 
            href="https://discord.gg/uWBYQSGXJf" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] rounded-lg text-white transition-colors"
          >
            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36">
              <path fill="currentColor" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            <span>Join our Discord</span>
          </a>
        </div>
      </div>
      
      {/* Bolt badge */}
      <div className="fixed bottom-4 right-4 z-50">
        <a href="https://bolt.new" target="_blank" rel="noopener noreferrer">
          <img src="/bolt-badge.png" alt="Built with Bolt" width="96" height="96" />
        </a>
      </div>
    </div>
  );
}

export default App;