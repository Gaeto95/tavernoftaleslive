import React, { useState, useEffect } from 'react';
import { Home, BookOpen } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCharacter } from '../../hooks/useCharacter';
import { useMultiplayerSession } from '../../hooks/useMultiplayerSession';
import { useSessionCleanup } from '../../hooks/useSessionCleanup';
import { AuthModal } from '../Auth/AuthModal';
import { SessionBrowser } from './SessionBrowser';
import { SessionCreator } from './SessionCreator';
import { MultiplayerGameInterface } from './MultiplayerGameInterface';
import { LobbyInterface } from './LobbyInterface';
import { CharacterCreation } from '../CharacterCreation';
import { CharacterSelector } from './CharacterSelector';
import { FloatingEmbers } from '../FloatingEmbers';
import { GameInstructions } from './GameInstructions';
import { GameSession } from '../../types/multiplayer';
import { LoadingOverlay } from './LoadingOverlay';

interface MultiplayerAppProps {
  onBackToHome?: () => void;
}

export function MultiplayerApp({ onBackToHome }: MultiplayerAppProps) {
  const { user, loading: authLoading, error: authError, signIn, signUp, signOut } = useAuth();
  const { character, saveCharacter, hasCharacter, clearCharacter } = useCharacter();
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

  const { processCleanupQueue, checkGameStartConditions } = useSessionCleanup();

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

  // Periodically refresh session data to ensure we have the latest
  useEffect(() => {
    if (currentSessionId) {
      const refreshInterval = setInterval(() => {
        refreshSession();
      }, 10000); // Refresh every 10 seconds
      
      return () => clearInterval(refreshInterval);
    }
  }, [currentSessionId, refreshSession]);

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

  // Show auth modal
  if (showAuthModal && !user) {
    return (
      <div className="min-h-screen bg-black">
        <FloatingEmbers />
        
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="fixed top-4 right-4 z-50 inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-amber-600 text-amber-300 hover:bg-gray-800 transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
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
        <FloatingEmbers />
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
        <FloatingEmbers />
        
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="fixed top-4 right-4 z-50 inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-amber-600 text-amber-300 hover:bg-gray-800 transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
        )}
        
        <CharacterCreation
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
        <FloatingEmbers />
        
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="fixed top-4 right-4 z-50 inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-amber-600 text-amber-300 hover:bg-gray-800 transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
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
        <FloatingEmbers />
        
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="fixed top-4 right-4 z-50 inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-amber-600 text-amber-300 hover:bg-gray-800 transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
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
        <FloatingEmbers />
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
        />
        
        {/* Character switch button - moved to avoid overlapping with volume controls */}
        <div className="fixed bottom-20 right-4 z-30">
          <button
            onClick={handleSwitchCharacter}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors text-sm"
          >
            Switch Character
          </button>
        </div>
      </div>
    );
  }

  // Show lobby interface if in a session but game hasn't started
  if (currentSessionId && session) {
    return (
      <div className="min-h-screen bg-black">
        <FloatingEmbers />
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
        
        {/* Character switch button - moved to avoid overlapping with volume controls */}
        <div className="fixed bottom-20 right-4 z-30">
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

  // Show session browser
  return (
    <div className="min-h-screen bg-black">
      <FloatingEmbers />
      
      {/* Loading overlay for joining sessions */}
      <LoadingOverlay 
        isVisible={isJoiningSession} 
        message="Joining session..." 
      />
      
      {onBackToHome && (
        <button
          onClick={onBackToHome}
          className="fixed top-4 right-4 z-50 inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-amber-600 text-amber-300 hover:bg-gray-800 transition-colors text-sm"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>
      )}
      
      <SessionBrowser
        onJoinSession={handleJoinSession}
        onCreateSession={() => setShowSessionCreator(true)}
        onSignOut={handleSignOut}
        currentUserId={user?.id || ''}
        isLoading={isJoiningSession}
      />
      
      {/* Character Info & Buttons - Moved to avoid volume control overlap */}
      {character && (
        <div className="fixed bottom-20 left-4 bg-amber-900/80 backdrop-blur-sm border border-amber-600/50 rounded-lg px-4 py-2 shadow-lg z-30">
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
        className="fixed bottom-4 right-4 z-30 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors text-sm flex items-center space-x-2"
      >
        <BookOpen className="w-4 h-4" />
        <span>How to Play</span>
      </button>
    </div>
  );
}