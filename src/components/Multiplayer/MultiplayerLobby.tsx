import React, { useState, useEffect } from 'react';
import { Users, Plus, RefreshCw, ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { MultiplayerSession } from '../../types/multiplayer';
import { CharacterModel } from '../../types/character';

interface MultiplayerLobbyProps {
  onJoinSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onBack: () => void;
  availableSessions: MultiplayerSession[];
  currentCharacter: CharacterModel | null;
  onRefreshSessions: () => void;
  isLoading: boolean;
}

export function MultiplayerLobby({
  onJoinSession,
  onCreateSession,
  onBack,
  availableSessions,
  currentCharacter,
  onRefreshSessions,
  isLoading
}: MultiplayerLobbyProps) {
  const [musicVolume, setMusicVolume] = useState(7);
  const [isMuted, setIsMuted] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState(0);

  // Simulate fetching online player count
  useEffect(() => {
    setOnlinePlayers(Math.floor(Math.random() * 50) + 10);
  }, [availableSessions]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        {/* This would be your 3D scene */}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-amber-700/90 hover:bg-amber-600/90 text-amber-100 rounded-lg transition-colors flex items-center"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Lobby
        </button>

        <h1 className="text-4xl font-bold text-amber-400 text-center">Multiplayer Lobby</h1>

        <div className="flex items-center">
          <span className="text-amber-300 mr-4">
            {onlinePlayers} Adventurers Online
          </span>
          <button
            onClick={onRefreshSessions}
            disabled={isLoading}
            className="p-2 bg-amber-700/90 hover:bg-amber-600/90 text-amber-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="absolute top-20 bottom-20 left-0 right-0 z-10 px-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Character Info */}
          {currentCharacter && (
            <div className="bg-gray-900/80 border border-amber-600/50 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-amber-700/50 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-amber-300" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xl text-amber-300">Playing as: {currentCharacter.name}</h3>
                  <p className="text-amber-200">Level {currentCharacter.level} {currentCharacter.class}</p>
                </div>
              </div>
            </div>
          )}

          {/* Create Session Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={onCreateSession}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-lg transition-colors flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Session
            </button>
          </div>

          {/* Available Sessions */}
          <h2 className="text-2xl text-amber-400 mb-4">Available Sessions</h2>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-amber-300">Loading available sessions...</p>
            </div>
          ) : availableSessions.length === 0 ? (
            <div className="text-center py-12 bg-gray-900/60 border border-amber-600/30 rounded-lg">
              <Users className="w-16 h-16 text-amber-500/50 mx-auto mb-4" />
              <h3 className="text-xl text-amber-400 mb-2">No Active Sessions</h3>
              <p className="text-amber-300">Create a new session to begin your adventure!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-gray-900/80 border border-amber-600/50 hover:border-amber-500 rounded-lg p-4 transition-all duration-300 hover:transform hover:scale-105"
                >
                  <h3 className="text-xl text-amber-300 mb-2">{session.name}</h3>
                  <p className="text-amber-200 text-sm mb-3">{session.description}</p>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-amber-400 text-sm">
                      {session.players}/{session.maxPlayers} Players
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      session.status === 'active' 
                        ? 'bg-green-600/30 text-green-400' 
                        : 'bg-gray-600/30 text-gray-400'
                    }`}>
                      {session.status === 'active' ? 'Active' : 'Waiting'}
                    </span>
                  </div>
                  <button
                    onClick={() => onJoinSession(session.id)}
                    className="w-full py-2 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-lg transition-colors"
                  >
                    Join Session
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer with Audio Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2 bg-gray-900/80 border border-amber-600/30 rounded-full px-4 py-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            
            <input
              type="range"
              min="0"
              max="10"
              value={musicVolume}
              onChange={(e) => setMusicVolume(parseInt(e.target.value))}
              disabled={isMuted}
              className="w-24 accent-amber-500"
            />
            
            <span className="text-amber-300 text-sm">{musicVolume}0%</span>
          </div>
          
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            How to Play
          </button>
        </div>
      </div>
    </div>
  );
}