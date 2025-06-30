import React, { useState, useEffect } from 'react';
import { 
  User, X, RefreshCw, AlertTriangle, Sword, 
  Clock, Calendar, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ConfirmationModal } from './ConfirmationModal';

interface PlayerDetailsModalProps {
  player: any;
  onClose: () => void;
  onRefresh: () => void;
}

export function PlayerDetailsModal({ player, onClose, onRefresh }: PlayerDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'characters' | 'sessions' | 'activity'>('characters');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});

  // Load player details
  const loadPlayerDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load characters
      const { data: charactersData, error: charactersError } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', player.id);
        
      if (charactersError) throw charactersError;
      
      setCharacters(charactersData || []);
      
      // Load sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('session_players')
        .select(`
          *,
          session:game_sessions(*),
          character:characters(name, level, class_id)
        `)
        .eq('user_id', player.id);
        
      if (sessionsError) throw sessionsError;
      
      setSessions(sessionsData || []);
    } catch (err) {
      console.error('Error loading player details:', err);
      setError('Failed to load player details');
    } finally {
      setLoading(false);
    }
  };

  // Load details on mount
  useEffect(() => {
    loadPlayerDetails();
  }, [player.id]);

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Make admin
  const confirmMakeAdmin = () => {
    setConfirmationAction({
      title: 'Make Admin',
      message: `Are you sure you want to give ${player.username} admin privileges? This will allow them to access the admin dashboard.`,
      action: async () => {
        try {
          setLoading(true);
          
          // Update user role to 'admin'
          const { error } = await supabase
            .from('users')
            .update({ role: 'admin' })
            .eq('id', player.id);
          
          if (error) throw error;
          
          // Reload player details and parent view
          await loadPlayerDetails();
          onRefresh();
        } catch (err) {
          console.error('Error making admin:', err);
          setError('Failed to make admin');
        } finally {
          setLoading(false);
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  // Remove admin
  const confirmRemoveAdmin = () => {
    setConfirmationAction({
      title: 'Remove Admin',
      message: `Are you sure you want to remove admin privileges from ${player.username}?`,
      action: async () => {
        try {
          setLoading(true);
          
          // Update user role to 'user'
          const { error } = await supabase
            .from('users')
            .update({ role: 'user' })
            .eq('id', player.id);
          
          if (error) throw error;
          
          // Reload player details and parent view
          await loadPlayerDetails();
          onRefresh();
        } catch (err) {
          console.error('Error removing admin:', err);
          setError('Failed to remove admin');
        } finally {
          setLoading(false);
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  // Ban player
  const confirmBanPlayer = () => {
    setConfirmationAction({
      title: 'Ban Player',
      message: `Are you sure you want to ban ${player.username}? This will prevent them from logging in.`,
      action: async () => {
        try {
          setLoading(true);
          
          // Update user role to 'banned'
          const { error } = await supabase
            .from('users')
            .update({ role: 'banned' })
            .eq('id', player.id);
          
          if (error) throw error;
          
          // Reload player details and parent view
          await loadPlayerDetails();
          onRefresh();
        } catch (err) {
          console.error('Error banning player:', err);
          setError('Failed to ban player');
        } finally {
          setLoading(false);
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  // Unban player
  const confirmUnbanPlayer = () => {
    setConfirmationAction({
      title: 'Unban Player',
      message: `Are you sure you want to unban ${player.username}? This will allow them to log in again.`,
      action: async () => {
        try {
          setLoading(true);
          
          // Update user role to 'user'
          const { error } = await supabase
            .from('users')
            .update({ role: 'user' })
            .eq('id', player.id);
          
          if (error) throw error;
          
          // Reload player details and parent view
          await loadPlayerDetails();
          onRefresh();
        } catch (err) {
          console.error('Error unbanning player:', err);
          setError('Failed to unban player');
        } finally {
          setLoading(false);
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-4xl w-full mx-4 my-8 relative">
        {/* Confirmation Modal */}
        {showConfirmation && confirmationAction && (
          <ConfirmationModal
            title={confirmationAction.title}
            message={confirmationAction.message}
            onConfirm={confirmationAction.action}
            onCancel={() => setShowConfirmation(false)}
            isLoading={loading}
          />
        )}
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start">
            <div className="p-3 rounded-full bg-blue-500/20 mr-4">
              <User className="w-8 h-8 text-blue-400" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{player.username}</h2>
              <p className="text-gray-300">{player.display_name || player.username}</p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  player.role === 'admin' 
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-600' 
                    : player.role === 'banned'
                    ? 'bg-red-600/30 text-red-300 border border-red-600'
                    : 'bg-blue-600/30 text-blue-300 border border-blue-600'
                }`}>
                  {player.role || 'user'}
                </span>
                
                <span className="px-2 py-1 bg-gray-700 rounded-full text-xs text-gray-300">
                  ID: {player.id}
                </span>
                
                <span className="px-2 py-1 bg-gray-700 rounded-full text-xs text-gray-300">
                  Joined: {formatDate(player.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-6">
            <p className="text-red-200 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
              {error}
            </p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={loadPlayerDetails}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors flex items-center"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          {player.role === 'admin' ? (
            <button
              onClick={confirmRemoveAdmin}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors flex items-center"
              disabled={loading}
            >
              <User className="w-4 h-4 mr-2" />
              <span>Remove Admin</span>
            </button>
          ) : player.role !== 'banned' && (
            <button
              onClick={confirmMakeAdmin}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors flex items-center"
              disabled={loading}
            >
              <User className="w-4 h-4 mr-2" />
              <span>Make Admin</span>
            </button>
          )}
          
          {player.role === 'banned' ? (
            <button
              onClick={confirmUnbanPlayer}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors flex items-center"
              disabled={loading}
            >
              <User className="w-4 h-4 mr-2" />
              <span>Unban Player</span>
            </button>
          ) : (
            <button
              onClick={confirmBanPlayer}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors flex items-center"
              disabled={loading}
            >
              <User className="w-4 h-4 mr-2" />
              <span>Ban Player</span>
            </button>
          )}
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('characters')}
            className={`px-4 py-3 font-medium flex items-center ${
              activeTab === 'characters'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Sword className="w-5 h-5 mr-2" />
            Characters
          </button>
          
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-3 font-medium flex items-center ${
              activeTab === 'sessions'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Clock className="w-5 h-5 mr-2" />
            Sessions
          </button>
          
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-3 font-medium flex items-center ${
              activeTab === 'activity'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Calendar className="w-5 h-5 mr-2" />
            Activity
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="max-h-96 overflow-y-auto">
          {/* Characters Tab */}
          {activeTab === 'characters' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Player Characters</h3>
              
              {loading ? (
                <div className="flex justify-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : characters.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  No characters found for this player
                </div>
              ) : (
                <div className="space-y-4">
                  {characters.map((character) => (
                    <div 
                      key={character.id} 
                      className="border border-gray-700 rounded-lg overflow-hidden"
                    >
                      <div 
                        className="bg-gray-700 p-3 flex justify-between items-center cursor-pointer"
                        onClick={() => toggleSection(`character-${character.id}`)}
                      >
                        <div className="flex items-center">
                          <Sword className="w-4 h-4 text-amber-400 mr-2" />
                          <span className="text-white font-medium">{character.name}</span>
                          <span className="ml-2 text-gray-400 text-sm">
                            Level {character.level} {character.class_id}
                          </span>
                        </div>
                        
                        {expandedSections[`character-${character.id}`] ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      
                      {expandedSections[`character-${character.id}`] && (
                        <div className="p-3 bg-gray-750">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <div className="text-gray-400 text-sm">Background</div>
                              <div className="text-white">{character.background || 'None'}</div>
                            </div>
                            
                            <div>
                              <div className="text-gray-400 text-sm">Experience</div>
                              <div className="text-white">{character.experience}</div>
                            </div>
                            
                            <div>
                              <div className="text-gray-400 text-sm">HP</div>
                              <div className="text-white">{character.hit_points}/{character.max_hit_points}</div>
                            </div>
                            
                            <div>
                              <div className="text-gray-400 text-sm">AC</div>
                              <div className="text-white">{character.armor_class}</div>
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <div className="text-gray-400 text-sm mb-1">Stats</div>
                            <pre className="bg-gray-800 p-2 rounded text-xs text-gray-300 overflow-x-auto">
                              {JSON.stringify(character.stats, null, 2)}
                            </pre>
                          </div>
                          
                          <div className="text-gray-400 text-xs">
                            Created: {formatDate(character.created_at)}
                          </div>
                          <div className="text-gray-400 text-xs">
                            Last Updated: {formatDate(character.updated_at)}
                          </div>
                          
                          <div className="mt-3 flex justify-end">
                            <button
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm flex items-center"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Full Details
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Player Sessions</h3>
              
              {loading ? (
                <div className="flex justify-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  No sessions found for this player
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((sessionPlayer) => (
                    <div 
                      key={sessionPlayer.id} 
                      className="border border-gray-700 rounded-lg overflow-hidden"
                    >
                      <div 
                        className="bg-gray-700 p-3 flex justify-between items-center cursor-pointer"
                        onClick={() => toggleSection(`session-${sessionPlayer.id}`)}
                      >
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-green-400 mr-2" />
                          <span className="text-white font-medium">{sessionPlayer.session?.name || 'Unknown Session'}</span>
                          <span className="ml-2 text-gray-400 text-sm">
                            {sessionPlayer.role}
                          </span>
                          {sessionPlayer.is_ready && (
                            <span className="ml-2 px-2 py-0.5 bg-green-600/30 text-green-300 rounded-full text-xs">
                              Ready
                            </span>
                          )}
                        </div>
                        
                        {expandedSections[`session-${sessionPlayer.id}`] ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      
                      {expandedSections[`session-${sessionPlayer.id}`] && (
                        <div className="p-3 bg-gray-750">
                          {sessionPlayer.session && (
                            <>
                              <div className="text-gray-400 text-sm mb-1">Session Details</div>
                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                  <div className="text-gray-400 text-xs">Status</div>
                                  <div className="text-white">{sessionPlayer.session.is_active ? 'Active' : 'Inactive'}</div>
                                </div>
                                
                                <div>
                                  <div className="text-gray-400 text-xs">Turn</div>
                                  <div className="text-white">{sessionPlayer.session.current_turn}</div>
                                </div>
                                
                                <div>
                                  <div className="text-gray-400 text-xs">Phase</div>
                                  <div className="text-white capitalize">{sessionPlayer.session.turn_phase}</div>
                                </div>
                                
                                <div>
                                  <div className="text-gray-400 text-xs">Players</div>
                                  <div className="text-white">{sessionPlayer.session.current_players}/{sessionPlayer.session.max_players}</div>
                                </div>
                              </div>
                            </>
                          )}
                          
                          {sessionPlayer.character && (
                            <div className="mb-3">
                              <div className="text-gray-400 text-sm mb-1">Playing As</div>
                              <div className="text-white">{sessionPlayer.character.name} (Level {sessionPlayer.character.level} {sessionPlayer.character.class_id})</div>
                            </div>
                          )}
                          
                          <div className="text-gray-400 text-xs">
                            Joined: {formatDate(sessionPlayer.joined_at)}
                          </div>
                          
                          {sessionPlayer.last_action_time && (
                            <div className="text-gray-400 text-xs">
                              Last Action: {formatDate(sessionPlayer.last_action_time)}
                            </div>
                          )}
                          
                          <div className="mt-3 flex justify-end">
                            <button
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm flex items-center"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Session
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Player Activity</h3>
              
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <h4 className="text-white font-medium mb-2">Activity Summary</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 text-sm">Last Seen</div>
                    <div className="text-white">{formatDate(player.last_seen)}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-sm">Account Created</div>
                    <div className="text-white">{formatDate(player.created_at)}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-sm">Characters</div>
                    <div className="text-white">{characters.length}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-sm">Sessions</div>
                    <div className="text-white">{sessions.length}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Recent Activity</h4>
                
                <div className="text-center py-4 text-gray-400">
                  Detailed activity tracking coming soon
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}