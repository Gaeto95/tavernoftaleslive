import React, { useState, useEffect, useCallback } from 'react';
import { Home, BookOpen, RefreshCw, WifiOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCharacter } from '../../hooks/useCharacter';
import { useMultiplayerSession } from '../../hooks/useMultiplayerSession';
import { useSessionCleanup } from '../../hooks/useSessionCleanup';
import { AuthModal } from '../Auth/AuthModal';
import { SessionBrowser } from './SessionBrowser';
import { SessionCreator } from './SessionCreator';
import { MultiplayerGameInterface } from './MultiplayerGameInterface';
import { LobbyInterface } from './LobbyInterface';
import { CharacterCreation3D } from '../CharacterCreation3D';
import { CharacterSelector } from './CharacterSelector';
import { FloatingEmbers } from '../FloatingEmbers';
import { BackgroundMusic } from '../BackgroundMusic';
import { GameInstructions } from './GameInstructions';
import { GameSession } from '../../types/multiplayer';
import { LoadingOverlay } from './LoadingOverlay';
import { MultiplayerLobby } from '../3D/MultiplayerLobby';
import { useCharacterStore } from '../../stores/characterStore';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { TavernBackground } from '../TavernBackground';

interface Multiplayer3DAppProps {
  onBackToHome?: () => void;
}

export function Multiplayer3DApp({ onBackToHome }: Multiplayer3DAppProps) {
  const { user, loading: authLoading, error: authError, signIn, signUp, signOut } = useAuth();
  const { character, saveCharacter, hasCharacter, clearCharacter } = useCharacter();
  const { appearance, loadAppearance } = useCharacterStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSessionCreator, setShowSessionCreator] = useState(false);
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [pendingSessionJoin, setPendingSessionJoin] = useState<GameSession | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [isJoiningSession, setIsJoiningSession] = useState(false);
  const [isLeavingSession, setIsLeavingSession] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [use3DLobby, setUse3DLobby] = useState(true);
  const [showConnectionAlert, setShowConnectionAlert] = useState(false);

  const {
    session,
    players,
    storyEntries,
    turnState,
    currentPlayer,
    isHost,
    hasSubmittedAction,
    loading: sessionLoading,
    error: sessionError,
    isConnected,
    reconnectAttempts,
    createSession,
    joinSession,
    leaveSession,
    switchCharacter,
    submitAction,
    setReady,
    processTurn,
    startTurnCollection,
    startGame,
    cleanupUserSessions,
    refreshSession
  } = useMultiplayerSession(currentSessionId, user?.id || null);

  const { processCleanupQueue, cleanupOrphanedSessions, cleanupUserSessions: cleanupUserSessionsFromHook } = useSessionCleanup();

  // Load character appearance on mount
  useEffect(() => {
    if (user) {
      loadAppearance();
    }
  }, [user, loadAppearance]);

  // Show auth modal if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true);
    }
  }, [authLoading, user]);

  // Check if game has started based on session state
  useEffect(() => {
    if (session && session.turn_phase !== 'waiting') {
      setGameStarted(true);
    } else {
      setGameStarted(false);
    }
  }, [session]);

  // Show instructions for first-time users
  useEffect(() => {
    const hasSeenInstructions = localStorage.getItem('has-seen-multiplayer-instructions');
    if (user && !hasSeenInstructions && !showAuthModal) {
      setShowInstructions(true);
      localStorage.setItem('has-seen-multiplayer-instructions', 'true');
    }
  }, [user, showAuthModal]);

  // Show connection status alerts
  useEffect(() => {
    if (!isConnected && reconnectAttempts > 0) {
      setShowConnectionAlert(true);
    } else if (isConnected && reconnectAttempts === 0 && showConnectionAlert) {
      // Hide alert after a delay when reconnected
      const timer = setTimeout(() => {
        setShowConnectionAlert(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, reconnectAttempts, showConnectionAlert]);

  // Periodically refresh session data to ensure we have the latest
  useEffect(() => {
    if (currentSessionId) {
      const refreshInterval = setInterval(() => {
        if (isConnected) {
          refreshSession();
        }
      }, 10000); // Refresh every 10 seconds
      
      return () => clearInterval(refreshInterval);
    }
  }, [currentSessionId, refreshSession, isConnected]);

  // Run cleanup operations periodically
  useEffect(() => {
    // Clean up orphaned sessions every 5 minutes
    const cleanupInterval = setInterval(() => {
      cleanupOrphanedSessions();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(cleanupInterval);
  }, [cleanupOrphanedSessions]);

  // Handle session joining with automatic character flow
  const handleJoinSession = async (gameSession: GameSession) => {
    if (!user) return;
    
    setIsJoiningSession(true);
    
    try {
      console.log('Joining session:', gameSession.name, 'User has character:', hasCharacter());
      
      // Set the session ID first
      setCurrentSessionId(gameSession.id);
      
      // If user doesn't have a character, show character selection
      if (!hasCharacter()) {
        console.log('No character found, showing character selector');
        setPendingSessionJoin(gameSession);
        setShowCharacterSelector(true);
        setIsJoiningSession(false);
        return;
      }
      
      // If user has a character, join directly
      console.log('Joining with existing character:', character?.name);
      await joinSession(character!.id);
      
      // Force refresh session data after joining
      setTimeout(() => {
        refreshSession();
        setIsJoiningSession(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to join session:', error);
      setCurrentSessionId(null);
      setIsJoiningSession(false);
    }
  };

  const handleLeaveSession = async () => {
    setIsLeavingSession(true);
    try {
      await leaveSession();
      setCurrentSessionId(null);
      setGameStarted(false);
      setPendingSessionJoin(null);
      setIsLeavingSession(false);
    } catch (error) {
      console.error('Failed to leave session:', error);
      setIsLeavingSession(false);
    }
  };

  // Handle session creation
  const handleCreateSession = async (sessionData: any) => {
    if (!user) return;
    
    setIsCreatingSession(true);
    
    try {
      console.log('Creating session with data:', sessionData);
      const sessionId = await createSession(sessionData);
      console.log('Session created successfully:', sessionId);
      
      // Set the session ID and wait for the session to load
      setCurrentSessionId(sessionId);
      setShowSessionCreator(false);
      
      // If user doesn't have a character, show character selection
      if (!hasCharacter()) {
        setShowCharacterSelector(true);
        setIsCreatingSession(false);
      } else {
        // Join with existing character
        await joinSession(character!.id);
        
        // Force refresh session data after joining
        setTimeout(() => {
          refreshSession();
          setIsCreatingSession(false);
        }, 1000);
      }
      
    } catch (error) {
      console.error('Failed to create session:', error);
      setIsCreatingSession(false);
    }
  };

  const handleCharacterCreated = (newCharacter: any) => {
    console.log('Character created:', newCharacter.name);
    saveCharacter(newCharacter);
    setShowCharacterCreation(false);
    
    // If we were trying to join a session, join it now
    if (pendingSessionJoin && currentSessionId) {
      console.log('Joining pending session with new character');
      setIsJoiningSession(true);
      joinSession(newCharacter.id).then(() => {
        setPendingSessionJoin(null);
        
        // Force refresh session data after joining
        setTimeout(() => {
          refreshSession();
          setIsJoiningSession(false);
        }, 1000);
      }).catch(error => {
        console.error('Failed to join session with new character:', error);
        setIsJoiningSession(false);
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await cleanupUserSessions();
      
      // Also clean up using the hook function
      if (user?.id) {
        await cleanupUserSessionsFromHook(user.id);
      }
      
      await signOut();
      
      // Clear local state
      setCurrentSessionId(null);
      setGameStarted(false);
      setPendingSessionJoin(null);
      clearCharacter();
      setShowAuthModal(true);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleSubmitAction = async (action: string) => {
    if (!character) return;
    await submitAction(action, character.id);
  };

  const handleSetReady = async (ready: boolean) => {
    await setReady(ready);
    
    // Force refresh session data after setting ready
    setTimeout(() => {
      refreshSession();
    }, 500);
  };

  const handleStartGame = async () => {
    if (!isHost) return;
    
    try {
      await startGame();
      setGameStarted(true);
      
      // Force refresh session data after starting game
      setTimeout(() => {
        refreshSession();
      }, 1000);
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };

  const handleSwitchCharacter = () => {
    setShowCharacterSelector(true);
  };

  const handleCharacterSelected = async (selectedCharacter: any) => {
    console.log('Character selected:', selectedCharacter.name);
    
    if (currentSessionId) {
      try {
        await switchCharacter(selectedCharacter.id);
        saveCharacter(selectedCharacter);
        setShowCharacterSelector(false);
        
        // If we had a pending session join, complete it now
        if (pendingSessionJoin) {
          setPendingSessionJoin(null);
        }
        
        // Force refresh session data after switching character
        setTimeout(() => {
          refreshSession();
        }, 1000);
      } catch (error) {
        console.error('Failed to switch character:', error);
      }
    } else {
      saveCharacter(selectedCharacter);
      setShowCharacterSelector(false);
    }
  };

  const handleCreateNewCharacter = () => {
    setShowCharacterSelector(false);
    setShowCharacterCreation(true);
  };

  const toggleLobbyMode = () => {
    setUse3DLobby(!use3DLobby);
  };

  // Manual reconnect handler
  const handleManualReconnect = useCallback(() => {
    refreshSession();
  }, [refreshSession]);

  // Show auth modal
  if (showAuthModal && !user) {
    return (
      <div className="min-h-screen bg-black">
        <TavernBackground />
        <FloatingEmbers />
        <BackgroundMusic volume={0.07} autoPlay={true} />
        
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="fixed top-4 right-4 z-50 px-4 py-2 bg-gray-800/80 border border-amber-600 rounded-lg text-amber-300 hover:bg-gray-700/80 transition-colors"
          >
            <Home className="w-4 h-4 mr-2 inline-block" />
            <span>Home</span>
          </button>
        )}
        
        <AuthModal
          isOpen={true}
          onClose={() => {}}
          onSignIn={signIn}
          onSignUp={signUp}
          onSignInWithGoogle={async () => {}}
          loading={authLoading}
          error={authError}
        />
      </div>
    );
  }

  // Show game instructions
  if (showInstructions) {
    return (
      <div className="min-h-screen bg-black">
        <TavernBackground />
        <FloatingEmbers />
        <BackgroundMusic volume={0.07} autoPlay={true} />
        <GameInstructions
          isOpen={true}
          onClose={() => setShowInstructions(false)}
          userRole={isHost ? 'host' : 'player'}
        />
      </div>
    );
  }

  // Show character creation
  if (showCharacterCreation && user) {
    return (
      <div className="min-h-screen bg-black">
        <TavernBackground />
        <FloatingEmbers />
        <BackgroundMusic volume={0.07} autoPlay={true} />
        
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="fixed top-4 right-4 z-50 px-4 py-2 bg-gray-800/80 border border-amber-600 rounded-lg text-amber-300 hover:bg-gray-700/80 transition-colors"
          >
            <Home className="w-4 h-4 mr-2 inline-block" />
            <span>Home</span>
          </button>
        )}
        
        <CharacterCreation3D
          onCharacterCreated={handleCharacterCreated}
          onCancel={() => {
            setShowCharacterCreation(false);
            if (pendingSessionJoin) {
              // If we were trying to join a session, go back to character selector
              setShowCharacterSelector(true);
            }
          }}
        />
      </div>
    );
  }

  // Show character selector
  if (showCharacterSelector && user) {
    return (
      <div className="min-h-screen bg-black">
        <TavernBackground />
        <FloatingEmbers />
        <BackgroundMusic volume={0.07} autoPlay={true} />
        
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="fixed top-4 right-4 z-50 px-4 py-2 bg-gray-800/80 border border-amber-600 rounded-lg text-amber-300 hover:bg-gray-700/80 transition-colors"
          >
            <Home className="w-4 h-4 mr-2 inline-block" />
            <span>Home</span>
          </button>
        )}
        
        <CharacterSelector
          currentUserId={user.id}
          onCharacterSelected={handleCharacterSelected}
          onCreateNew={handleCreateNewCharacter}
          onCancel={() => {
            setShowCharacterSelector(false);
            if (pendingSessionJoin) {
              // If we were trying to join a session, cancel the join
              setCurrentSessionId(null);
              setPendingSessionJoin(null);
            }
          }}
          inSession={!!currentSessionId}
        />
      </div>
    );
  }

  // Show session creator
  if (showSessionCreator) {
    return (
      <div className="min-h-screen bg-black">
        <TavernBackground />
        <FloatingEmbers />
        <BackgroundMusic volume={0.07} autoPlay={true} />
        
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="fixed top-4 right-4 z-50 px-4 py-2 bg-gray-800/80 border border-amber-600 rounded-lg text-amber-300 hover:bg-gray-700/80 transition-colors"
          >
            <Home className="w-4 h-4 mr-2 inline-block" />
            <span>Home</span>
          </button>
        )}
        
        <SessionCreator
          onSessionCreated={handleCreateSession}
          onCancel={() => setShowSessionCreator(false)}
          currentUser={user}
          isLoading={isCreatingSession}
        />
      </div>
    );
  }

  // Show game interface if in a session and game has started
  if (currentSessionId && session && gameStarted) {
    return (
      <div className="min-h-screen bg-black">
        <TavernBackground />
        <FloatingEmbers />
        <BackgroundMusic volume={0.07} autoPlay={true} />
        <MultiplayerGameInterface
          session={session}
          players={players}
          currentPlayer={currentPlayer}
          character={character}
          storyEntries={storyEntries}
          turnState={turnState}
          isHost={isHost}
          hasSubmittedAction={hasSubmittedAction}
          onSubmitAction={handleSubmitAction}
          onSetReady={handleSetReady}
          onProcessTurn={processTurn}
          onStartTurnCollection={startTurnCollection}
          onLeaveSession={handleLeaveSession}
          onBackToHome={onBackToHome}
          loading={sessionLoading || isLeavingSession}
          onShowInstructions={() => setShowInstructions(true)}
          isConnected={isConnected}
          reconnectAttempts={reconnectAttempts}
          onManualReconnect={handleManualReconnect}
        />
        
        {/* Connection Status Alert */}
        {showConnectionAlert && (
          <div className="fixed bottom-28 right-4 z-50">
            <ConnectionStatusIndicator
              isConnected={isConnected}
              reconnectAttempts={reconnectAttempts}
              onManualReconnect={handleManualReconnect}
            />
          </div>
        )}
        
        {/* Character switch button - moved to avoid overlapping with volume controls */}
        <div className="fixed bottom-28 left-4 z-30">
          <button
            onClick={handleSwitchCharacter}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors text-sm"
          >
            {character ? 'Switch Character' : 'Select Character'}
          </button>
        </div>
      </div>
    );
  }

  // Show lobby interface if in a session but game hasn't started
  if (currentSessionId && session) {
    return (
      <div className="min-h-screen bg-black">
        <TavernBackground />
        <FloatingEmbers />
        <BackgroundMusic volume={0.07} autoPlay={true} />
        <LobbyInterface
          session={session}
          players={players}
          currentPlayer={currentPlayer}
          isHost={isHost}
          onStartGame={handleStartGame}
          onUpdateSettings={() => {}}
          onKickPlayer={() => {}}
          onLeaveSession={handleLeaveSession}
          onSetReady={handleSetReady}
          loading={sessionLoading || isLeavingSession}
        />
        
        {/* Connection Status Alert */}
        {showConnectionAlert && (
          <div className="fixed bottom-28 right-4 z-50">
            <ConnectionStatusIndicator
              isConnected={isConnected}
              reconnectAttempts={reconnectAttempts}
              onManualReconnect={handleManualReconnect}
            />
          </div>
        )}
        
        {/* Character switch button - moved to avoid overlapping with volume controls */}
        <div className="fixed bottom-28 left-4 z-30">
          <button
            onClick={handleSwitchCharacter}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors text-sm"
          >
            {character ? 'Switch Character' : 'Select Character'}
          </button>
        </div>
      </div>
    );
  }

  // Show 3D session browser or regular session browser
  return (
    <div className="min-h-screen bg-black">
      <TavernBackground />
      <FloatingEmbers />
      <BackgroundMusic volume={0.07} autoPlay={true} />
      
      {/* Loading overlay for joining sessions */}
      <LoadingOverlay 
        isVisible={isJoiningSession} 
        message="Joining session..." 
      />
      
      {onBackToHome && (
        <button
          onClick={onBackToHome}
          className="fixed top-4 right-4 z-50 px-4 py-2 bg-gray-800/80 border border-amber-600 rounded-lg text-amber-300 hover:bg-gray-700/80 transition-colors"
        >
          <Home className="w-4 h-4 mr-2 inline-block" />
          <span>Home</span>
        </button>
      )}
      
      {use3DLobby ? (
        <MultiplayerLobby
          onJoinSession={handleJoinSession}
          onCreateSession={() => setShowSessionCreator(true)}
          onBackToHome={onBackToHome}
          toggleLobbyMode={toggleLobbyMode}
        />
      ) : (
        <SessionBrowser
          onJoinSession={handleJoinSession}
          onCreateSession={() => setShowSessionCreator(true)}
          onSignOut={handleSignOut}
          currentUserId={user?.id || ''}
          isLoading={isJoiningSession}
          toggleLobbyMode={toggleLobbyMode}
        />
      )}
      
      {/* Character Info & Buttons - Moved above sessions list */}
      {character && (
        <div className="fixed top-32 left-4 bg-amber-900/80 backdrop-blur-sm border border-amber-600/50 rounded-lg px-4 py-2 shadow-lg z-30">
          <div className="text-amber-300 text-sm mb-2">
            Playing as: <span className="font-bold">{character.name}</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSwitchCharacter}
              className="text-amber-400 hover:text-amber-300 text-xs underline"
            >
              Switch Character
            </button>
            <button
              onClick={handleCreateNewCharacter}
              className="text-amber-400 hover:text-amber-300 text-xs underline"
            >
              Create New
            </button>
          </div>
        </div>
      )}

      {/* Instructions Button */}
      <button
        onClick={() => setShowInstructions(true)}
        className="fixed bottom-16 right-4 z-30 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors text-sm flex items-center space-x-2"
      >
        <BookOpen className="w-4 h-4" />
        <span>How to Play</span>
      </button>
    </div>
  );
}