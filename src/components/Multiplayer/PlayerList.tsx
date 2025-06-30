import React from 'react';
import { Crown, User, Eye, CheckCircle, Clock, X, Shield, Heart, Sword } from 'lucide-react';
import { SessionPlayer } from '../../types/multiplayer';

interface PlayerListProps {
  players: SessionPlayer[];
  currentUserId: string;
  onClose: () => void;
}

export function PlayerList({ players, currentUserId, onClose }: PlayerListProps) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'dm': return Crown;
      case 'observer': return Eye;
      default: return User;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'dm': return 'text-amber-400';
      case 'observer': return 'text-gray-400';
      default: return 'text-blue-400';
    }
  };

  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-amber-600/30 flex items-center justify-between">
        <h3 className="fantasy-title text-lg text-amber-300">
          Players ({players.length})
        </h3>
        <button
          onClick={onClose}
          className="text-amber-400 hover:text-amber-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Player List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {players.map((player) => {
          const RoleIcon = getRoleIcon(player.role);
          const roleColor = getRoleColor(player.role);
          const isCurrentUser = player.user_id === currentUserId;
          
          return (
            <div
              key={player.id}
              className={`p-4 rounded-lg border transition-colors ${
                isCurrentUser
                  ? 'bg-amber-900/30 border-amber-600/50'
                  : 'bg-gray-800/50 border-gray-600/30 hover:border-gray-500/50'
              }`}
            >
              {/* Player Info */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <RoleIcon className={`w-5 h-5 ${roleColor}`} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-amber-200 font-medium">
                        {player.user?.display_name || player.user?.username}
                      </span>
                      {isCurrentUser && (
                        <span className="text-xs bg-amber-600 text-black px-2 py-1 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-amber-400 capitalize">
                      {player.role}
                    </div>
                  </div>
                </div>

                {/* Ready Status */}
                <div className="flex items-center space-x-2">
                  {player.is_ready ? (
                    <div className="flex items-center space-x-1 text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs">Ready</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">Waiting</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Character Info */}
              {player.character && (
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 mt-2">
                  <div className="text-sm text-amber-300 mb-2 flex items-center">
                    <User className="w-4 h-4 mr-1 text-amber-400" />
                    <span>{player.character.name}</span>
                    <span className="text-xs text-amber-400 ml-2">
                      Level {player.character.level} {player.character.class?.name}
                    </span>
                  </div>
                  
                  {/* Character Stats */}
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="flex items-center text-xs">
                      <Heart className="w-3 h-3 text-red-400 mr-1" />
                      <span className="text-red-300">
                        {player.character.hit_points}/{player.character.max_hit_points}
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <Shield className="w-3 h-3 text-blue-400 mr-1" />
                      <span className="text-blue-300">
                        AC {player.character.armor_class}
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <Sword className="w-3 h-3 text-amber-400 mr-1" />
                      <span className="text-amber-300">
                        +{player.character.proficiency_bonus}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Action */}
              <div className="text-xs text-gray-400 mt-2">
                Last seen: {formatLastSeen(player.last_action_time)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-amber-600/30 text-center">
        <div className="text-xs text-amber-400">
          Real-time multiplayer session
        </div>
      </div>
    </div>
  );
}