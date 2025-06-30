import React, { useState, useEffect } from 'react';
import { Users, MessageSquare, Settings, LogOut, Volume2, VolumeX } from 'lucide-react';
import { MultiplayerSession, Player } from '../../types/multiplayer';
import { CharacterModel } from '../../types/character';

interface MultiplayerInterfaceProps {
  session: MultiplayerSession;
  players: Player[];
  currentPlayer: Player;
  onLeaveSession: () => void;
  onSendMessage: (message: string) => void;
  onToggleReady: () => void;
  messages: { id: string; sender: string; content: string; timestamp: number }[];
}

export function MultiplayerInterface({
  session,
  players,
  currentPlayer,
  onLeaveSession,
  onSendMessage,
  onToggleReady,
  messages
}: MultiplayerInterfaceProps) {
  const [message, setMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [musicVolume, setMusicVolume] = useState(7);
  const [isMuted, setIsMuted] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        {/* This would be your 3D scene */}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gray-900/80 border-b border-amber-600/30">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-amber-400">{session.name}</h1>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowPlayerList(!showPlayerList)}
              className="px-4 py-2 bg-amber-700/90 hover:bg-amber-600/90 text-amber-100 rounded-lg transition-colors flex items-center"
            >
              <Users className="w-5 h-5 mr-2" />
              Players ({players.length}/{session.maxPlayers})
            </button>
            
            <button
              onClick={() => setShowChat(!showChat)}
              className="px-4 py-2 bg-amber-700/90 hover:bg-amber-600/90 text-amber-100 rounded-lg transition-colors flex items-center"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Chat
            </button>
            
            <button
              onClick={onLeaveSession}
              className="px-4 py-2 bg-red-700/90 hover:bg-red-600/90 text-white rounded-lg transition-colors flex items-center"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Leave
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="absolute top-16 bottom-16 left-0 right-0 z-10">
        {/* This is where your main game content would go */}
      </div>

      {/* Player List Sidebar */}
      {showPlayerList && (
        <div className="absolute top-16 right-0 bottom-16 w-80 z-20 bg-gray-900/90 border-l border-amber-600/30 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xl text-amber-400 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Players
            </h2>
            
            <div className="space-y-3">
              {players.map((player) => (
                <div 
                  key={player.id}
                  className={`p-3 rounded-lg ${
                    player.id === currentPlayer.id 
                      ? 'bg-amber-900/30 border border-amber-500' 
                      : 'bg-gray-800/60 border border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-200 font-medium">{player.name}</p>
                      <p className="text-amber-400 text-sm">
                        {player.character ? `${player.character.name} (Lvl ${player.character.level})` : 'No character selected'}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      player.isReady 
                        ? 'bg-green-600/30 text-green-400' 
                        : 'bg-gray-600/30 text-gray-400'
                    }`}>
                      {player.isReady ? 'Ready' : 'Not Ready'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Sidebar */}
      {showChat && (
        <div className="absolute top-16 left-0 bottom-16 w-80 z-20 bg-gray-900/90 border-r border-amber-600/30 flex flex-col">
          <div className="p-4 border-b border-amber-600/30">
            <h2 className="text-xl text-amber-400 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Chat
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`p-3 rounded-lg ${
                  msg.sender === currentPlayer.name 
                    ? 'bg-amber-900/30 ml-6' 
                    : 'bg-gray-800/60 mr-6'
                }`}
              >
                <p className="text-amber-400 text-sm font-medium">{msg.sender}</p>
                <p className="text-amber-100">{msg.content}</p>
                <p className="text-amber-500/50 text-xs text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-amber-600/30">
            <form onSubmit={handleSendMessage} className="flex">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 p-2 bg-gray-800 border border-amber-600/30 rounded-l-lg text-amber-100 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded-r-lg transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gray-900/80 border-t border-amber-600/30">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
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
          
          <div className="flex items-center space-x-4">
            <button
              onClick={onToggleReady}
              className={`px-6 py-3 rounded-lg transition-colors ${
                currentPlayer.isReady
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-black font-bold'
              }`}
            >
              {currentPlayer.isReady ? 'Not Ready' : 'Ready'}
            </button>
            
            {session.hostId === currentPlayer.id && (
              <button
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                disabled={!players.every(p => p.isReady)}
              >
                Start Game
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}