import React, { useState, useEffect } from 'react';
import { Clock, Users, Play, CheckCircle, AlertTriangle, BookOpen, Loader, WifiOff, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GameSession, SessionPlayer } from '../../types/multiplayer';

interface SessionStatusIndicatorProps {
  session: GameSession;
  players: SessionPlayer[];
  isHost: boolean;
  onStartGame?: () => void;
  isLoading?: boolean;
  isConnected?: boolean;
  onManualReconnect?: () => void;
}

interface GameStartCheck {
  can_start: boolean;
  reason: string;
  player_count: number;
  ready_count: number;
  min_players: number;
}

export function SessionStatusIndicator({ 
  session, 
  players, 
  isHost, 
  onStartGame, 
  isLoading = false,
  isConnected = true,
  onManualReconnect
}: SessionStatusIndicatorProps) {
  const [gameStartCheck, setGameStartCheck] = useState<GameStartCheck | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [checkingConditions, setCheckingConditions] = useState(false);

  useEffect(() => {
    if (isConnected) {
      checkGameStartConditions();
    }
  }, [session, players, isConnected]);

  // Countdown effect when starting game
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      setIsStarting(false);
      onStartGame?.();
    }
  }, [countdown, onStartGame]);

  const checkGameStartConditions = async () => {
    setCheckingConditions(true);
    try {
      const { data, error } = await supabase.rpc('can_start_game', {
        session_uuid: session.id
      });

      if (error) {
        console.error('Failed to check game start conditions:', error);
        return;
      }

      if (data && data.length > 0) {
        setGameStartCheck(data[0]);
      }
    } catch (err) {
      console.error('Error checking game start conditions:', err);
    } finally {
      setCheckingConditions(false);
    }
  };

  const handleStartGame = () => {
    setIsStarting(true);
    setCountdown(3); // 3 second countdown
  };

  const getStatusColor = () => {
    if (!isConnected) {
      return 'text-red-400 bg-red-900/20 border-red-600/30';
    } else if (session.turn_phase === 'waiting' && gameStartCheck?.can_start) {
      return 'text-green-400 bg-green-900/20 border-green-600/30';
    } else if (session.turn_phase === 'collecting') {
      return 'text-blue-400 bg-blue-900/20 border-blue-600/30';
    } else if (session.turn_phase === 'processing') {
      return 'text-purple-400 bg-purple-900/20 border-purple-600/30';
    } else {
      return 'text-yellow-400 bg-yellow-900/20 border-yellow-600/30';
    }
  };

  const getStatusIcon = () => {
    if (!isConnected) {
      return WifiOff;
    } else if (session.turn_phase === 'waiting' && gameStartCheck?.can_start) {
      return CheckCircle;
    } else if (session.turn_phase === 'collecting') {
      return Clock;
    } else if (session.turn_phase === 'processing') {
      return Play;
    } else {
      return AlertTriangle;
    }
  };

  const getStatusMessage = () => {
    if (!isConnected) {
      return 'Connection lost. Attempting to reconnect...';
    } else if (session.turn_phase === 'waiting') {
      return gameStartCheck?.reason || 'Waiting to start';
    } else if (session.turn_phase === 'collecting') {
      return `Collecting actions (${gameStartCheck?.ready_count || 0}/${gameStartCheck?.player_count || 0} submitted)`;
    } else if (session.turn_phase === 'processing') {
      return 'Host is processing turn...';
    } else {
      return 'Turn completed';
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <>
      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="text-8xl font-bold text-amber-400 mb-4 animate-pulse">
              {countdown}
            </div>
            <div className="text-2xl text-amber-300">
              Adventure begins in...
            </div>
          </div>
        </div>
      )}

      <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <StatusIcon className="w-6 h-6" />
            <div>
              <div className="font-bold">
                {session.turn_phase === 'waiting' ? 'Game Status' : `Turn ${session.current_turn}`}
              </div>
              <div className="text-sm opacity-90">
                {getStatusMessage()}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Manual Reconnect Button */}
            {!isConnected && onManualReconnect && (
              <button
                onClick={onManualReconnect}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reconnect</span>
              </button>
            )}
            
            {/* Player Count */}
            <div className="flex items-center space-x-2 text-sm">
              <Users className="w-4 h-4" />
              <span>
                {gameStartCheck?.player_count || 0}/{session.max_players} players
              </span>
            </div>

            {/* Ready Count */}
            {session.turn_phase === 'waiting' && (
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>
                  {gameStartCheck?.ready_count || 0} ready
                </span>
              </div>
            )}

            {/* Start Game Button for Host */}
            {isHost && session.turn_phase === 'waiting' && gameStartCheck?.can_start &&
              !isStarting && isConnected && (
              <button
                onClick={handleStartGame}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
                disabled={isLoading || checkingConditions || !isConnected}
              >
                {isLoading || checkingConditions ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Start Game</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Additional Info for Hosts */}
        {isHost && session.turn_phase === 'waiting' && !gameStartCheck?.can_start && isConnected && (
          <div className="mt-3 pt-3 border-t border-current/20">
            <div className="flex items-center space-x-2 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Cannot start: {gameStartCheck?.reason}</span>
            </div>
            {gameStartCheck && gameStartCheck.player_count < gameStartCheck.min_players && (
              <div className="mt-2 text-sm opacity-75">
                Need at least {gameStartCheck.min_players} players to start the game
              </div>
            )}
          </div>
        )}

        {/* Game Instructions Link */}
        <div className="mt-3 pt-3 border-t border-current/20">
          <div className="text-sm opacity-75">
            {isHost ? (
              <span>💡 As host, you control the game flow. Start the game when everyone is ready, then process turns to advance the story.</span>
            ) : (
              <span>💡 When the game starts, submit your actions during the collection phase. Be creative with your character!</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}