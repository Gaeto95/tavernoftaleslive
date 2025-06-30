import React, { useState, useEffect } from 'react';
import { 
  Clock, Users, X, RefreshCw, AlertTriangle, 
  User, MessageSquare, Play, Pause, Settings,
  ChevronRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ConfirmationModal } from './ConfirmationModal';

interface SessionDetailsModalProps {
  session: any;
  onClose: () => void;
  onRefresh: () => void;
}

export function SessionDetailsModal({ session, onClose, onRefresh }: SessionDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [storyEntries, setStoryEntries] = useState<any[]>([]);
  const [turnActions, setTurnActions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'players' | 'story' | 'actions' | 'settings'>('players');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});

  // Load session details
  const loadSessionDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load players
      const { data: playersData, error: playersError } = await supabase
        .from('session_players')
        .select(`
          *,
          user:users(*),
          character:characters(*)
        `)
        .eq('session_id', session.id);
        
      if (playersError) throw playersError;
      
      setPlayers(playersData || []);
      
      // Load story entries
      const { data: storyData, error: storyError } = await supabase
        .from('story_entries')
        .select(`
          *,
          user:users(*)
        `)
        .eq('session_id', session.id)
        .order('timestamp', { ascending: true });
        
      if (storyError) throw storyError;
      
      setStoryEntries(storyData || []);
      
      // Load turn actions
      const { data: actionsData, error: actionsError } = await supabase
        .from('turn_actions')
        .select(`
          *,
          user:users(*),
          character:characters(*)
        `)
        .eq('session_id', session.id)
        .order('turn_number', { ascending: false });
        
      if (actionsError) throw actionsError;
      
      setTurnActions(actionsData || []);
    } catch (err) {
      console.error('Error loading session details:', err);
      setError('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  // Load details on mount
  useEffect(() => {
    loadSessionDetails();
  }, [session.id]);

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Kick player
  const confirmKickPlayer = (player: any) => {
    setConfirmationAction({
      title: 'Kick Player',
      message: `Are you sure you want to remove ${player.user?.username || 'this player'} from the session?`,
      action: async () => {
        try {
          setLoading(true);
          
          // Delete the player from the session
          const { error } = await supabase
            .from('session_players')
            .delete()
            .eq('id', player.id);
          
          if (error) throw error;
          
          // Reload session details
          await loadSessionDetails();
          onRefresh();
        } catch (err) {
          console.error('Error kicking player:', err);
          setError('Failed to kick player');
        } finally {
          setLoading(false);
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  // End session
  const confirmEndSession = () => {
    setConfirmationAction({
      title: 'End Session',
      message: `Are you sure you want to end the session "${session.name}"? This will remove all players and mark the session as inactive.`,
      action: async () => {
        try {
          setLoading(true);
          
          // Call RPC function to force end the session
          const { error } = await supabase.rpc('force_end_session', {
            session_uuid: session.id
          });
          
          if (error) throw error;
          
          // Reload session details and parent view
          await loadSessionDetails();
          onRefresh();
        } catch (err) {
          console.error('Error ending session:', err);
          setError('Failed to end session');
        } finally {
          setLoading(false);
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  // Change session phase
  const confirmChangePhase = (newPhase: string) => {
    setConfirmationAction({
      title: 'Change Session Phase',
      message: `Are you sure you want to change the session phase to "${newPhase}"?`,
      action: async () => {
        try {
          setLoading(true);
          
          // Call RPC function to change session phase
          const { error } = await supabase.rpc('change_session_phase', {
            session_uuid: session.id,
            new_phase: newPhase
          });
          
          if (error) throw error;
          
          // Reload session details and parent view
          await loadSessionDetails();
          onRefresh();
        } catch (err) {
          console.error('Error changing session phase:', err);
          setError('Failed to change session phase');
        } finally {
          setLoading(false);
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  // Reset turn
  const confirmResetTurn = () => {
    setConfirmationAction({
      title: 'Reset Turn',
      message: 'Are you sure you want to reset the current turn? This will clear all submitted actions and reset the turn phase to "waiting".',
      action: async () => {
        try {
          setLoading(true);
          
          // Call RPC function to reset turn
          const { error } = await supabase.rpc('reset_session_turn', {
            session_uuid: session.id
          });
          
          if (error) throw error;
          
          // Reload session details and parent view
          await loadSessionDetails();
          onRefresh();
        } catch (err) {
          console.error('Error resetting turn:', err);
          setError('Failed to reset turn');
        } finally {
          setLoading(false);
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
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
          <h2 className="text-2xl font-bold text-white mb-2">{session.name}</h2>
          <p className="text-gray-300">{session.description}</p>
          
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="bg-gray-700 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-400">Host:</span>{' '}
              <span className="text-white">{session.host?.username || 'Unknown'}</span>
            </div>
            
            <div className="bg-gray-700 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-400">Players:</span>{' '}
              <span className="text-white">{session.current_players}/{session.max_players}</span>
            </div>
            
            <div className="bg-gray-700 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-400">Turn:</span>{' '}
              <span className="text-white">{session.current_turn}</span>
            </div>
            
            <div className="bg-gray-700 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-400">Phase:</span>{' '}
              <span className="text-white capitalize">{session.turn_phase}</span>
            </div>
            
            <div className="bg-gray-700 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-400">Created:</span>{' '}
              <span className="text-white">{formatDate(session.created_at)}</span>
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
            onClick={loadSessionDetails}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors flex items-center"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          {session.is_active && (
            <>
              <button
                onClick={confirmEndSession}
                className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white transition-colors flex items-center"
                disabled={loading}
              >
                <Pause className="w-4 h-4 mr-2" />
                <span>End Session</span>
              </button>
              
              <button
                onClick={confirmResetTurn}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors flex items-center"
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                <span>Reset Turn</span>
              </button>
              
              <div className="relative group">
                <button
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors flex items-center"
                  disabled={loading}
                >
                  <Play className="w-4 h-4 mr-2" />
                  <span>Change Phase</span>
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>
                
                <div className="absolute left-0 mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-10 hidden group-hover:block">
                  <button
                    onClick={() => confirmChangePhase('waiting')}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700"
                  >
                    Waiting
                  </button>
                  <button
                    onClick={() => confirmChangePhase('collecting')}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700"
                  >
                    Collecting
                  </button>
                  <button
                    onClick={() => confirmChangePhase('processing')}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700"
                  >
                    Processing
                  </button>
                  <button
                    onClick={() => confirmChangePhase('completed')}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700"
                  >
                    Completed
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('players')}
            className={`px-4 py-3 font-medium flex items-center ${
              activeTab === 'players'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Users className="w-5 h-5 mr-2" />
            Players
          </button>
          
          <button
            onClick={() => setActiveTab('story')}
            className={`px-4 py-3 font-medium flex items-center ${
              activeTab === 'story'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Story
          </button>
          
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-4 py-3 font-medium flex items-center ${
              activeTab === 'actions'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Play className="w-5 h-5 mr-2" />
            Actions
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 font-medium flex items-center ${
              activeTab === 'settings'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="max-h-96 overflow-y-auto">
          {/* Players Tab */}
          {activeTab === 'players' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Session Players</h3>
              
              {loading ? (
                <div className="flex justify-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : players.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  No players in this session
                </div>
              ) : (
                <div className="space-y-4">
                  {players.map((player) => (
                    <div key={player.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <User className="w-5 h-5 text-blue-400 mr-2" />
                            <span className="text-white font-medium">{player.user?.username || 'Unknown'}</span>
                            <span className="ml-2 px-2 py-0.5 bg-gray-600 rounded-full text-xs text-gray-300">
                              {player.role}
                            </span>
                            {player.is_ready && (
                              <span className="ml-2 px-2 py-0.5 bg-green-600/30 text-green-300 rounded-full text-xs">
                                Ready
                              </span>
                            )}
                          </div>
                          
                          {player.character && (
                            <div className="mt-2 text-gray-300 text-sm">
                              Playing as: {player.character.name} (Level {player.character.level} {player.character.class_id})
                            </div>
                          )}
                          
                          <div className="mt-1 text-gray-400 text-xs">
                            Joined: {formatDate(player.joined_at)}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => confirmKickPlayer(player)}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Kick player"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Story Tab */}
          {activeTab === 'story' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Story Entries</h3>
              
              {loading ? (
                <div className="flex justify-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : storyEntries.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  No story entries in this session
                </div>
              ) : (
                <div className="space-y-4">
                  {storyEntries.map((entry) => (
                    <div 
                      key={entry.id} 
                      className="border border-gray-700 rounded-lg overflow-hidden"
                    >
                      <div 
                        className="bg-gray-700 p-3 flex justify-between items-center cursor-pointer"
                        onClick={() => toggleSection(`story-${entry.id}`)}
                      >
                        <div className="flex items-center">
                          <MessageSquare className="w-4 h-4 text-green-400 mr-2" />
                          <span className="text-white font-medium capitalize">{entry.type}</span>
                          <span className="ml-2 text-gray-400 text-sm">
                            {formatDate(entry.timestamp)}
                          </span>
                        </div>
                        
                        {expandedSections[`story-${entry.id}`] ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      
                      {expandedSections[`story-${entry.id}`] && (
                        <div className="p-3 bg-gray-750">
                          <p className="text-gray-300 whitespace-pre-wrap">{entry.content}</p>
                          
                          {entry.user && (
                            <div className="mt-2 text-gray-400 text-sm">
                              By: {entry.user.username}
                            </div>
                          )}
                          
                          {entry.voice_url && (
                            <div className="mt-2">
                              <audio 
                                src={entry.voice_url} 
                                controls 
                                className="w-full"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Actions Tab */}
          {activeTab === 'actions' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Turn Actions</h3>
              
              {loading ? (
                <div className="flex justify-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : turnActions.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  No turn actions in this session
                </div>
              ) : (
                <div className="space-y-4">
                  {turnActions.map((action) => (
                    <div 
                      key={action.id} 
                      className="border border-gray-700 rounded-lg overflow-hidden"
                    >
                      <div 
                        className="bg-gray-700 p-3 flex justify-between items-center cursor-pointer"
                        onClick={() => toggleSection(`action-${action.id}`)}
                      >
                        <div className="flex items-center">
                          <Play className="w-4 h-4 text-amber-400 mr-2" />
                          <span className="text-white font-medium">
                            Turn {action.turn_number}
                          </span>
                          <span className="ml-2 text-gray-400 text-sm">
                            {action.user?.username || 'Unknown'}
                          </span>
                          {action.is_processed && (
                            <span className="ml-2 px-2 py-0.5 bg-green-600/30 text-green-300 rounded-full text-xs">
                              Processed
                            </span>
                          )}
                        </div>
                        
                        {expandedSections[`action-${action.id}`] ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      
                      {expandedSections[`action-${action.id}`] && (
                        <div className="p-3 bg-gray-750">
                          <p className="text-gray-300 whitespace-pre-wrap">{action.action_text}</p>
                          
                          {action.character && (
                            <div className="mt-2 text-gray-400 text-sm">
                              Character: {action.character.name}
                            </div>
                          )}
                          
                          <div className="mt-2 text-gray-400 text-sm">
                            Submitted: {formatDate(action.submitted_at)}
                          </div>
                          
                          {action.is_processed && action.processed_at && (
                            <div className="mt-1 text-gray-400 text-sm">
                              Processed: {formatDate(action.processed_at)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Session Settings</h3>
              
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <h4 className="text-white font-medium mb-2">Basic Settings</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 text-sm">Public</div>
                    <div className="text-white">{session.is_public ? 'Yes' : 'No'}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-sm">Password Protected</div>
                    <div className="text-white">{session.password_hash ? 'Yes' : 'No'}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-sm">Max Players</div>
                    <div className="text-white">{session.max_players}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-sm">Active</div>
                    <div className="text-white">{session.is_active ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Advanced Settings</h4>
                
                <pre className="bg-gray-800 p-3 rounded text-gray-300 text-sm overflow-x-auto">
                  {JSON.stringify(session.session_settings || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}