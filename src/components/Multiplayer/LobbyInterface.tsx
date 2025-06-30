import React, { useState, useEffect, useRef } from 'react';
import { Users, Settings, Play, UserPlus, MessageSquare, Volume2, VolumeX, CheckCircle, Clock, AlertTriangle, BookOpen, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GameSession, SessionPlayer } from '../../types/multiplayer';
import { PlayerList } from './PlayerList';
import { SessionStatusIndicator } from './SessionStatusIndicator';
import { GameInstructions } from './GameInstructions';
import { MultiplayerChat } from './MultiplayerChat';
import { LoadingOverlay } from './LoadingOverlay';

interface LobbyInterfaceProps {
  session: GameSession;
  players: SessionPlayer[];
  currentPlayer: SessionPlayer | undefined;
  isHost: boolean;
  onStartGame: () => void;
  onUpdateSettings: (settings: any) => void;
  onKickPlayer: (playerId: string) => void;
  onLeaveSession: () => void;
  onSetReady: (ready: boolean) => void;
  loading?: boolean;
}

export function LobbyInterface({
  session,
  players,
  currentPlayer,
  isHost,
  onStartGame,
  onUpdateSettings,
  onKickPlayer,
  onLeaveSession,
  onSetReady,
  loading = false
}: LobbyInterfaceProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{id: string, user: string, message: string, timestamp: number}>>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const activePlayers = players.filter(p => p.role === 'player');
  const readyPlayers = activePlayers.filter(p => p.is_ready);

  // Load chat messages
  useEffect(() => {
    const loadChatMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            *,
            user:users(*)
          `)
          .eq('session_id', session.id)
          .order('timestamp', { ascending: true })
          .limit(20);

        if (error) {
          console.error('Error loading chat messages:', error);
          return;
        }

        if (data) {
          const formattedMessages = data.map(msg => ({
            id: msg.id,
            user: msg.user?.display_name || msg.user?.username || 'Unknown',
            message: msg.message,
            timestamp: new Date(msg.timestamp).getTime()
          }));
          setChatMessages(formattedMessages);
        }
      } catch (err) {
        console.error('Error loading chat messages:', err);
      }
    };

    loadChatMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`chat-${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${session.id}`
      }, (payload) => {
        loadChatMessages(); // Reload messages when new ones arrive
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session.id]);

  const handleSetReady = async (ready: boolean) => {
    setIsSubmitting(true);
    try {
      await onSetReady(ready);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-amber-50">
      {/* Loading Overlay */}
      <LoadingOverlay 
        isVisible={loading} 
        message="Updating session..." 
      />
      
      {/* Game Instructions Modal */}
      <GameInstructions
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        userRole={isHost ? 'host' : 'player'}
      />

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="parchment-panel p-0 max-w-2xl w-full mx-4 h-[80vh] flex flex-col">
            <MultiplayerChat
              sessionId={session.id}
              currentUser={currentPlayer?.user || null}
              onClose={() => setShowChat(false)}
              inputRef={chatInputRef}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-amber-600/30 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Users className="w-8 h-8 text-amber-400" />
              <div>
                <h1 className="fantasy-title text-3xl font-bold text-amber-300 glow-text">
                  {session.name}
                </h1>
                <p className="text-amber-200">{session.description}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Chat Button */}
              <button
                onClick={() => setShowChat(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-amber-600/20 border border-amber-600 rounded-lg text-amber-300 hover:bg-amber-600/30 transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Chat</span>
              </button>
              
              {/* Instructions Button */}
              <button
                onClick={() => setShowInstructions(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600/20 border border-blue-600 rounded-lg text-blue-300 hover:bg-blue-600/30 transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                <span>How to Play</span>
              </button>

              {isHost && (
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-3 bg-amber-600/20 border border-amber-600 rounded-lg text-amber-300 hover:bg-amber-600/30 transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}
              
              <button
                onClick={onLeaveSession}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Leaving...</span>
                  </div>
                ) : (
                  <span>Leave Session</span>
                )}
              </button>
            </div>
          </div>

          {/* Session Status Indicator */}
          <SessionStatusIndicator
            session={session}
            players={players}
            isHost={isHost}
            onStartGame={onStartGame}
            isLoading={loading}
          />
        </div>
      </header>

      {/* Main Lobby Content */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Players Panel */}
          <div className="lg:col-span-2">
            <div className="parchment-panel p-6">
              <h2 className="fantasy-title text-xl text-amber-300 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Adventure Party ({activePlayers.length}/{session.max_players})
              </h2>
              
              <div className="space-y-4">
                {players.map((player) => {
                  const isHost = session.host_id === player.user_id;
                  
                  return (
                    <div
                      key={player.id}
                      className={`p-4 rounded-lg border transition-all duration-300 ${
                        isHost
                          ? 'border-amber-400 bg-gradient-to-r from-amber-900/60 to-amber-800/40 shadow-lg shadow-amber-400/20'
                          : player.is_ready
                          ? 'border-green-500 bg-gradient-to-r from-green-900/60 to-green-800/40 shadow-lg shadow-green-400/20'
                          : 'border-gray-600 bg-gradient-to-r from-gray-800/60 to-gray-700/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {isHost ? (
                            <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center">
                              <span className="text-black font-bold text-xs">H</span>
                            </div>
                          ) : (
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                              player.is_ready 
                                ? 'border-green-400 bg-green-400 shadow-lg shadow-green-400/50' 
                                : 'border-gray-400 bg-gray-700'
                            }`}>
                              {player.is_ready && (
                                <CheckCircle className="w-4 h-4 text-white" />
                              )}
                            </div>
                          )}
                          
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-amber-200 font-medium">
                                {player.user?.display_name || player.user?.username}
                              </span>
                              {player.user_id === currentPlayer?.user_id && (
                                <span className="text-xs bg-amber-600 text-black px-2 py-1 rounded-full font-bold">
                                  You
                                </span>
                              )}
                              {isHost && (
                                <span className="text-xs bg-amber-400 text-black px-2 py-1 rounded-full font-bold">
                                  Host
                                </span>
                              )}
                            </div>
                            {player.character && (
                              <div className="text-xs text-amber-300">
                                Playing as: {player.character.name} (Level {player.character.level} {player.character.class?.name})
                              </div>
                            )}
                          </div>
                        </div>

                        {isHost && player.user_id !== currentPlayer?.user_id && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onKickPlayer(player.user_id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-sm font-medium transition-colors"
                              title="Remove player"
                              disabled={loading}
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ready Button for Players */}
              {currentPlayer && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => handleSetReady(!currentPlayer.is_ready)}
                    disabled={isSubmitting || loading}
                    className={`px-8 py-4 rounded-lg font-bold transition-all duration-300 text-lg ${
                      currentPlayer.is_ready
                        ? 'bg-gray-600 hover:bg-gray-700 text-gray-200 border-2 border-gray-500'
                        : 'rune-button text-black hover:scale-105 shadow-lg shadow-amber-400/30'
                    }`}
                  >
                    {isSubmitting || loading ? (
                      <div className="flex items-center space-x-2">
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Updating...</span>
                      </div>
                    ) : currentPlayer.is_ready ? (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5" />
                        <span>Ready! (Click to unready)</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5" />
                        <span>Ready to Adventure!</span>
                      </div>
                    )}
                  </button>
                  
                  {!currentPlayer.is_ready && (
                    <p className="text-amber-400 text-sm mt-2">
                      Click when you're ready to begin the adventure
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat & Info Panel */}
          <div className="space-y-6">
            {/* Session Info */}
            <div className="parchment-panel p-4">
              <h3 className="fantasy-title text-lg text-amber-300 mb-3">Session Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-amber-200">Game Mode:</span>
                  <span className="text-amber-100 capitalize">
                    {session.session_settings?.game_mode || 'Standard'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-200">Turn Limit:</span>
                  <span className="text-amber-100">
                    {session.session_settings?.turn_time_limit || 'No limit'} 
                    {session.session_settings?.turn_time_limit ? ' min' : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-200">Auto-advance:</span>
                  <span className="text-amber-100">
                    {session.session_settings?.auto_advance_turns ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-200">Voice:</span>
                  <span className="text-amber-100">
                    {session.session_settings?.voice_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-200">Observers:</span>
                  <span className="text-amber-100">
                    {session.session_settings?.allow_observers ? 'Allowed' : 'Not allowed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Preview */}
            <div className="parchment-panel p-4">
              <h3 className="fantasy-title text-lg text-amber-300 mb-3 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Tavern Chat
              </h3>
              
              <div className="h-48 overflow-y-auto custom-scrollbar mb-3 space-y-2">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="text-sm">
                    <span className="text-amber-400 font-medium">{msg.user}:</span>
                    <span className="text-amber-200 ml-2">{msg.message}</span>
                  </div>
                ))}
                {chatMessages.length === 0 && (
                  <div className="text-amber-400 text-sm italic text-center py-8">
                    The tavern is quiet... Start a conversation!
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setShowChat(true)}
                className="w-full py-2 px-4 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-600/50 rounded-lg text-amber-300 transition-colors text-sm"
              >
                Open Chat
              </button>
            </div>

            {/* Quick Tips */}
            <div className="parchment-panel p-4">
              <h3 className="fantasy-title text-lg text-amber-300 mb-3">Quick Tips</h3>
              <div className="space-y-2 text-sm text-amber-200">
                {isHost ? (
                  <>
                    <p>• Wait for all players to be ready before starting</p>
                    <p>• As host, you'll start the game when everyone's ready</p>
                    <p>• During the game, you'll process turns to advance the story</p>
                    <p>• Click "How to Play" for detailed host guide</p>
                  </>
                ) : (
                  <>
                    <p>• Mark yourself as ready when you're prepared</p>
                    <p>• Submit creative actions during your turn</p>
                    <p>• Use chat to coordinate with other players</p>
                    <p>• Click "How to Play" for detailed instructions</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}