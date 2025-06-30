import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Clock, CheckCircle, AlertCircle, Home, MessageSquare, BookOpen, Compass, Mic, MicOff, Loader, WifiOff, RefreshCw } from 'lucide-react';
import { GameSession, SessionPlayer, TurnState } from '../../types/multiplayer';
import { Character } from '../../types/character';
import { StoryHistory } from '../StoryHistory';
import { PlayerStats } from '../PlayerStats';
import { SceneImage } from '../SceneImage';
import { TurnTimer } from './TurnTimer';
import { PlayerList } from './PlayerList';
import { MultiplayerChat } from './MultiplayerChat';
import { GameInstructions } from './GameInstructions';
import { LoadingOverlay } from './LoadingOverlay';

interface MultiplayerGameInterfaceProps {
  session: GameSession;
  players: SessionPlayer[];
  currentPlayer: SessionPlayer | undefined;
  character: Character | null;
  storyEntries: any[];
  turnState: TurnState | null;
  isHost: boolean;
  hasSubmittedAction: boolean;
  onSubmitAction: (action: string) => Promise<any>;
  onSetReady: (ready: boolean) => Promise<any>;
  onProcessTurn: () => Promise<any>;
  onStartTurnCollection: (timeLimit: number) => Promise<any>;
  onLeaveSession: () => Promise<any>;
  onBackToHome?: () => void;
  onShowInstructions?: () => void;
  loading: boolean;
  isConnected?: boolean;
  reconnectAttempts?: number;
  onManualReconnect?: () => void;
}

export function MultiplayerGameInterface({
  session,
  players,
  currentPlayer,
  character,
  storyEntries,
  turnState,
  isHost,
  hasSubmittedAction,
  onSubmitAction,
  onSetReady,
  onProcessTurn,
  onStartTurnCollection,
  onLeaveSession,
  onBackToHome,
  onShowInstructions,
  loading,
  isConnected = true,
  reconnectAttempts = 0,
  onManualReconnect
}: MultiplayerGameInterfaceProps) {
  const [playerInput, setPlayerInput] = useState('');
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [optimisticAction, setOptimisticAction] = useState<string | null>(null);
  const [optimisticReady, setOptimisticReady] = useState<boolean | null>(null);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceInputSupported, setVoiceInputSupported] = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showConnectionAlert, setShowConnectionAlert] = useState(false);
  
  // Refs for optimistic UI updates and focus management
  const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const readyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  
  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceInputSupported(true);
    }
  }, []);
  
  // Reset optimistic states when actual data changes
  useEffect(() => {
    if (hasSubmittedAction && optimisticAction) {
      setOptimisticAction(null);
      if (actionTimeoutRef.current) {
        clearTimeout(actionTimeoutRef.current);
        actionTimeoutRef.current = null;
      }
    }
  }, [hasSubmittedAction, optimisticAction]);
  
  useEffect(() => {
    if (currentPlayer && optimisticReady !== null && optimisticReady === currentPlayer.is_ready) {
      setOptimisticReady(null);
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
    }
  }, [currentPlayer, optimisticReady]);

  // Focus input when chat closes
  useEffect(() => {
    if (!showChat && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showChat]);

  // Show connection alert when disconnected
  useEffect(() => {
    if (!isConnected) {
      setShowConnectionAlert(true);
    } else {
      // Hide alert after a delay when reconnected
      if (showConnectionAlert) {
        const timer = setTimeout(() => {
          setShowConnectionAlert(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isConnected, showConnectionAlert]);

  // Setup voice recognition
  const setupVoiceRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsVoiceRecording(true);
      setProcessingVoice(false);
    };
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      
      setPlayerInput(transcript);
    };
    
    recognition.onend = () => {
      setIsVoiceRecording(false);
      setProcessingVoice(false);
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsVoiceRecording(false);
      setProcessingVoice(false);
    };
    
    recognitionRef.current = recognition;
  };

  // Start voice input
  const startVoiceInput = () => {
    if (!recognitionRef.current) {
      setupVoiceRecognition();
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setProcessingVoice(true);
      } catch (error) {
        console.error('Failed to start voice recognition:', error);
      }
    }
  };

  // Stop voice input
  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Failed to stop voice recognition:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (playerInput.trim() && !loading && canSubmitAction()) {
      // Set optimistic action
      setOptimisticAction(playerInput.trim());
      
      // Set timeout to clear optimistic state if server doesn't respond
      actionTimeoutRef.current = setTimeout(() => {
        setOptimisticAction(null);
      }, 5000);
      
      // Show loading progress
      setIsProcessingTurn(true);
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        if (progress > 95) progress = 95;
        setLoadingProgress(progress);
      }, 300);
      
      try {
        await onSubmitAction(playerInput.trim());
        setPlayerInput('');
        clearInterval(progressInterval);
        setIsProcessingTurn(false);
        setLoadingProgress(100);
        
        // Reset progress after a moment
        setTimeout(() => {
          setLoadingProgress(0);
        }, 1000);
      } catch (error) {
        console.error('Error submitting action:', error);
        clearInterval(progressInterval);
        setIsProcessingTurn(false);
        setLoadingProgress(0);
      }
    }
  };

  const handleSetReady = async (ready: boolean) => {
    // Set optimistic ready state
    setOptimisticReady(ready);
    
    // Set timeout to clear optimistic state if server doesn't respond
    readyTimeoutRef.current = setTimeout(() => {
      setOptimisticReady(null);
    }, 5000);
    
    try {
      await onSetReady(ready);
    } catch (error) {
      console.error('Error setting ready state:', error);
      setOptimisticReady(null);
    }
  };

  const handleProcessTurn = async () => {
    setIsProcessingTurn(true);
    setLoadingProgress(10);
    
    // Simulate progress
    let progress = 10;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 5;
      if (progress > 95) progress = 95;
      setLoadingProgress(progress);
    }, 500);
    
    try {
      await onProcessTurn();
      clearInterval(progressInterval);
      setLoadingProgress(100);
      
      // Reset progress after a moment
      setTimeout(() => {
        setLoadingProgress(0);
        setIsProcessingTurn(false);
      }, 1000);
    } catch (error) {
      console.error('Error processing turn:', error);
      clearInterval(progressInterval);
      setLoadingProgress(0);
      setIsProcessingTurn(false);
    }
  };

  const canSubmitAction = () => {
    if (optimisticAction || hasSubmittedAction) return false; // Already submitted
    if (turnState?.turn_phase !== 'collecting') return false; // Not collecting actions
    return true;
  };

  const getTurnPhaseMessage = () => {
    if (!turnState) return '';
    
    switch (turnState.turn_phase) {
      case 'waiting':
        return isHost ? 'Start turn collection when ready' : 'Waiting for host to start the turn';
      case 'collecting':
        return `Collecting actions (${turnState.actions_submitted}/${turnState.total_players} submitted)`;
      case 'processing':
        return 'Host is processing the turn...';
      case 'completed':
        return 'Turn completed, advancing to next turn';
      default:
        return '';
    }
  };

  const allActionsSubmitted = turnState && turnState.actions_submitted >= turnState.total_players;
  
  // Determine if the player is ready (using optimistic state if available)
  const isPlayerReady = optimisticReady !== null ? optimisticReady : currentPlayer?.is_ready || false;
  
  // Determine if the player has submitted an action (using optimistic state if available)
  const hasPlayerSubmittedAction = optimisticAction !== null ? true : hasSubmittedAction;

  // Handle manual reconnection
  const handleManualReconnect = () => {
    if (onManualReconnect) {
      onManualReconnect();
    }
  };

  return (
    <div className="min-h-screen bg-black text-amber-50">
      {/* Loading Overlay */}
      <LoadingOverlay 
        isVisible={isProcessingTurn || (loading && isConnected)} 
        message="Processing turn... The story unfolds..." 
        progress={loadingProgress}
      />
      
      {/* Reconnecting Overlay */}
      <LoadingOverlay 
        isVisible={!isConnected && reconnectAttempts > 0}
        message="Connection lost"
        isReconnecting={true}
        reconnectAttempt={reconnectAttempts}
      />
      
      {/* Game Instructions Modal */}
      <GameInstructions
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        userRole={isHost ? 'host' : 'player'}
      />

      {/* Connection Alert */}
      {showConnectionAlert && isConnected && reconnectAttempts > 0 && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-green-900/80 border border-green-600 rounded-lg px-4 py-2 text-green-200 flex items-center space-x-2 animate-fadeIn">
          <RefreshCw className="w-4 h-4 text-green-400" />
          <span>Connection restored!</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-amber-600/30 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="fantasy-title text-2xl font-bold text-amber-300 glow-text">
              {session.name}
            </h1>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-amber-200 text-sm">
                Turn {session.current_turn}
              </span>
              <span className="text-amber-400 text-sm">
                {getTurnPhaseMessage()}
              </span>
              
              {/* Connection Status Indicator */}
              {!isConnected && (
                <span className="text-red-400 text-sm flex items-center">
                  <WifiOff className="w-4 h-4 mr-1 animate-pulse" />
                  Connection lost
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Manual Reconnect Button */}
            {!isConnected && onManualReconnect && (
              <button
                onClick={handleManualReconnect}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600/20 border border-green-600 rounded-lg text-green-300 hover:bg-green-600/30 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reconnect</span>
              </button>
            )}
            
            {/* Turn Timer */}
            {turnState?.turn_deadline && (
              <TurnTimer deadline={turnState.turn_deadline} />
            )}

            {/* Instructions Button */}
            <button
              onClick={() => setShowInstructions(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600/20 border border-blue-600 rounded-lg text-blue-300 hover:bg-blue-600/30 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>How to Play</span>
            </button>

            {/* Chat Toggle */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors ${
                showChat 
                  ? 'bg-amber-600/20 border-amber-600 text-amber-300' 
                  : 'bg-amber-600/10 border-amber-600/50 text-amber-400 hover:bg-amber-600/20'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
            </button>

            {/* Player Count */}
            <button
              onClick={() => setShowPlayerList(!showPlayerList)}
              className="flex items-center space-x-2 px-3 py-2 bg-amber-600/20 border border-amber-600 rounded-lg text-amber-300 hover:bg-amber-600/30 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>{session.current_players}/{session.max_players}</span>
            </button>

            {/* Host Controls */}
            {isHost && (
              <div className="flex items-center space-x-2">
                {turnState?.turn_phase === 'waiting' && (
                  <button
                    onClick={() => onStartTurnCollection(session.session_settings?.turn_time_limit || 5)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
                    disabled={loading || !isConnected}
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Starting...</span>
                      </div>
                    ) : (
                      <span>Start Turn</span>
                    )}
                  </button>
                )}
                {turnState?.turn_phase === 'collecting' && allActionsSubmitted && (
                  <button
                    onClick={handleProcessTurn}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                    disabled={isProcessingTurn || loading || !isConnected}
                  >
                    {isProcessingTurn || loading ? (
                      <div className="flex items-center space-x-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <span>Process Turn</span>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Home Button */}
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-gray-200 font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>
            )}

            {/* Leave Session */}
            <button
              onClick={onLeaveSession}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
              disabled={!isConnected}
            >
              Leave
            </button>
          </div>
        </div>
      </header>

      {/* Player List Sidebar */}
      {showPlayerList && (
        <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-amber-600/30 z-40 overflow-y-auto">
          <PlayerList
            players={players}
            currentUserId={currentPlayer?.user_id || ''}
            onClose={() => setShowPlayerList(false)}
          />
        </div>
      )}

      {/* Chat Sidebar */}
      {showChat && (
        <div className="fixed left-0 top-0 h-full w-80 bg-gray-900 border-r border-amber-600/30 z-40 overflow-y-auto">
          <MultiplayerChat
            sessionId={session.id}
            currentUser={currentPlayer?.user || null}
            currentCharacter={currentPlayer?.character || null}
            onClose={() => setShowChat(false)}
            inputRef={chatInputRef}
          />
        </div>
      )}

      {/* Main Game Area */}
      <div className={`transition-all duration-300 ${
        showPlayerList ? 'mr-80' : ''
      } ${
        showChat ? 'ml-80' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Story Panel */}
            <div className="lg:col-span-2">
              <div className="parchment-panel h-96 flex flex-col">
                <div className="p-4 border-b border-amber-600/30">
                  <h2 className="fantasy-title text-lg text-amber-300 text-center">
                    Chronicle of Adventures
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <StoryHistory
                    entries={storyEntries.map(entry => ({
                      id: entry.id,
                      type: entry.type,
                      content: entry.content,
                      timestamp: new Date(entry.timestamp).getTime(),
                      voiceUrl: entry.voice_url
                    }))}
                    onToggleVoice={() => {}}
                    autoPlayVoice={false}
                  />
                </div>
              </div>
            </div>

            {/* Scene Panel */}
            <div className="lg:col-span-1">
              <div className="h-96 w-full">
                <SceneImage
                  imageUrl="https://images.pexels.com/photos/161235/pexels-photo-161235.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                  alt="Current adventure scene"
                />
              </div>
            </div>

            {/* Stats Panel */}
            <div className="lg:col-span-1">
              {character && (
                <div className="h-96">
                  <PlayerStats
                    gameState={{
                      level: character.level,
                      xp: character.experience,
                      maxXp: character.level * 1000,
                      inventory: character.inventory,
                      storyHistory: [],
                      currentScene: '',
                      sessionId: session.id,
                      isLoading: false,
                      autoPlayVoice: false,
                      hasLeveledUp: false
                    }}
                    character={character}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Input */}
          <div className="mt-6">
            {/* Enhanced Status Bar */}
            <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {isPlayerReady ? (
                    <div className="flex items-center space-x-2 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span>Ready</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-amber-400">
                      <AlertCircle className="w-5 h-5" />
                      <span>Not Ready</span>
                    </div>
                  )}

                  {hasPlayerSubmittedAction && (
                    <div className="flex items-center space-x-2 text-blue-400">
                      <CheckCircle className="w-5 h-5" />
                      <span>Action Submitted</span>
                    </div>
                  )}

                  {/* Turn Phase Indicator */}
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                    turnState?.turn_phase === 'collecting' ? 'bg-green-600/20 text-green-400' :
                    turnState?.turn_phase === 'processing' ? 'bg-blue-600/20 text-blue-400' :
                    turnState?.turn_phase === 'waiting' ? 'bg-yellow-600/20 text-yellow-400' :
                    'bg-gray-600/20 text-gray-400'
                  }`}>
                    <Clock className="w-4 h-4" />
                    <span className="capitalize">{turnState?.turn_phase || 'Waiting'}</span>
                  </div>
                  
                  {/* Connection Status */}
                  {!isConnected && (
                    <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-red-600/20 text-red-400">
                      <WifiOff className="w-4 h-4" />
                      <span>Disconnected</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleSetReady(!isPlayerReady)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isPlayerReady
                      ? 'bg-gray-600 hover:bg-gray-700 text-gray-200'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                  disabled={loading || !isConnected}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </div>
                  ) : (
                    isPlayerReady ? 'Not Ready' : 'Ready'
                  )}
                </button>
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={playerInput}
                  onChange={(e) => setPlayerInput(e.target.value)}
                  placeholder={
                    !isConnected
                      ? "Waiting for connection to be restored..."
                      : hasPlayerSubmittedAction
                      ? "Action already submitted for this turn"
                      : canSubmitAction()
                      ? `What does ${currentPlayer?.character?.name || 'your character'} do? (e.g., 'I search the ancient chest')`
                      : "Wait for the host to start turn collection"
                  }
                  disabled={!canSubmitAction() || loading || isVoiceRecording || !isConnected}
                  className="w-full p-4 pr-24 spell-input rounded-lg text-amber-50 placeholder-amber-300 font-medium text-lg disabled:opacity-50"
                />
                
                {/* Voice Input Button */}
                {voiceInputSupported && (
                  <button
                    type="button"
                    onClick={isVoiceRecording ? stopVoiceInput : startVoiceInput}
                    disabled={!canSubmitAction() || loading || !isConnected}
                    className={`absolute right-14 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors ${
                      isVoiceRecording 
                        ? 'bg-red-600 text-white animate-pulse' 
                        : 'bg-amber-600/20 text-amber-300 hover:bg-amber-600/40'
                    }`}
                  >
                    {processingVoice ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : isVoiceRecording ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={!playerInput.trim() || !canSubmitAction() || loading || !isConnected}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 rune-button px-3 py-2 rounded-lg font-bold text-black disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="submit"
                  disabled={!playerInput.trim() || !canSubmitAction() || loading || !isConnected}
                  className="rune-button px-8 py-3 rounded-lg font-bold text-black text-lg disabled:opacity-50 fantasy-title"
                >
                  {!isConnected 
                    ? 'Waiting for connection...'
                    : hasPlayerSubmittedAction 
                    ? 'Action Submitted' 
                    : 'Submit Action'}
                </button>
              </div>
            </form>

            {/* Host Controls Panel */}
            {isHost && (
              <div className="text-center p-8 bg-amber-900/20 border border-amber-600/30 rounded-lg mt-4">
                <h3 className="fantasy-title text-xl text-amber-300 mb-2">Host Controls</h3>
                <p className="text-amber-200 mb-4">
                  As host, you guide the adventure and control the game flow.
                </p>
                
                <div className="flex justify-center space-x-4">
                  {turnState?.turn_phase === 'waiting' && (
                    <button
                      onClick={() => onStartTurnCollection(session.session_settings?.turn_time_limit || 5)}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
                      disabled={loading || !isConnected}
                    >
                      {loading ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          <span>Starting...</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-5 h-5" />
                          <span>Start Turn Collection</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  {turnState?.turn_phase === 'collecting' && allActionsSubmitted && (
                    <button
                      onClick={handleProcessTurn}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
                      disabled={isProcessingTurn || loading || !isConnected}
                    >
                      {isProcessingTurn || loading ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>Process Turn</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}