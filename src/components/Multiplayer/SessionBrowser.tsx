import React, { useState, useEffect } from 'react';
import { Users, Crown, Clock, Lock, Plus, Search, Filter, RefreshCw, BookOpen, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GameSession } from '../../types/multiplayer';
import { GameInstructions } from './GameInstructions';
import { LoadingOverlay } from './LoadingOverlay';

interface SessionBrowserProps {
  onJoinSession: (session: GameSession) => void;
  onCreateSession: () => void;
  onSignOut: () => void;
  currentUserId: string;
  isLoading?: boolean;
  toggleLobbyMode?: () => void; // Added prop for toggling lobby mode
}

export function SessionBrowser({ 
  onJoinSession, 
  onCreateSession, 
  onSignOut, 
  currentUserId, 
  isLoading = false,
  toggleLobbyMode // Added prop
}: SessionBrowserProps) {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState(true);
  const [filterFull, setFilterFull] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [joiningSession, setJoiningSession] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    setRefreshing(true);
    
    try {
      console.log('Loading sessions...');
      
      let query = supabase
        .from('game_sessions')
        .select(`
          *,
          host:users!host_id(*)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (filterActive) {
        query = query.eq('is_active', true);
      }

      const { data, error: queryError } = await query;
      
      if (queryError) {
        console.error('Supabase query error:', queryError);
        throw queryError;
      }

      console.log('Sessions loaded:', data);
      let filteredSessions = data || [];

      // Apply search filter
      if (searchTerm) {
        filteredSessions = filteredSessions.filter(session =>
          session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (session.description && session.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      // Apply full filter
      if (!filterFull) {
        filteredSessions = filteredSessions.filter(session =>
          session.current_players < session.max_players
        );
      }

      setSessions(filteredSessions);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [filterActive, filterFull, searchTerm]);

  const getSessionStatus = (session: GameSession) => {
    if (!session.is_active) return { text: 'Inactive', color: 'text-gray-400' };
    if (session.current_players >= session.max_players) return { text: 'Full', color: 'text-red-400' };
    if (session.turn_phase === 'collecting') return { text: 'In Turn', color: 'text-yellow-400' };
    if (session.turn_phase === 'processing') return { text: 'Processing', color: 'text-blue-400' };
    return { text: 'Open', color: 'text-green-400' };
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleJoinSession = async (session: GameSession) => {
    setJoiningSession(session.id);
    try {
      console.log('Joining session:', session.id);
      onJoinSession(session);
    } catch (error) {
      console.error('Error joining session:', error);
      setError('Failed to join session. Please try again.');
      setJoiningSession(null);
    }
  };

  const handleCreateSession = async () => {
    console.log('Creating new session');
    try {
      onCreateSession();
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session. Please try again.');
    }
  };

  const handleSignOut = async () => {
    console.log('Sign out button clicked');
    setSigningOut(true);
    setError(null);
    
    try {
      await onSignOut();
      console.log('Sign out completed from SessionBrowser');
    } catch (error) {
      console.error('Error signing out from SessionBrowser:', error);
      setError('Failed to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const handleRefresh = () => {
    loadSessions();
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Loading Overlay */}
      <LoadingOverlay 
        isVisible={isLoading} 
        message="Joining session..." 
      />
      
      {/* Game Instructions Modal */}
      <GameInstructions
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        userRole="player"
      />

      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="fantasy-title text-3xl font-bold text-amber-300 mb-2 glow-text">
          Available Sessions
        </h1>
      </div>

      {/* Controls */}
      <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sessions..."
              className="w-full pl-10 pr-4 py-2 spell-input rounded-lg text-amber-50"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-amber-300">
              <input
                type="checkbox"
                checked={filterActive}
                onChange={(e) => setFilterActive(e.target.checked)}
                className="rounded border-amber-600 bg-gray-800 text-amber-600 focus:ring-amber-500"
              />
              <span>Active only</span>
            </label>
            <label className="flex items-center space-x-2 text-amber-300">
              <input
                type="checkbox"
                checked={!filterFull}
                onChange={(e) => setFilterFull(!e.target.checked)}
                className="rounded border-amber-600 bg-gray-800 text-amber-600 focus:ring-amber-500"
              />
              <span>Hide full</span>
            </label>
            <button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="p-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-black transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Switch to 3D Lobby Button */}
            {toggleLobbyMode && (
              <button
                onClick={toggleLobbyMode}
                className="px-4 py-2 bg-gray-800/80 border border-amber-600 rounded-lg text-amber-300 hover:bg-gray-700/80 transition-colors"
              >
                Switch to 3D Lobby
              </button>
            )}
            
            <button
              onClick={() => setShowInstructions(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600/20 border border-blue-600 rounded-lg text-blue-300 hover:bg-blue-600/30 transition-colors"
            >
              <BookOpen className="w-5 h-5" />
              <span>How to Play</span>
            </button>

            <button
              onClick={handleSignOut}
              disabled={loading || signingOut || isLoading}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-gray-200 font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {signingOut ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Signing Out...</span>
                </>
              ) : (
                <span>Sign Out</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-4">
          <p className="text-red-200">Error: {error}</p>
          <button
            onClick={loadSessions}
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Create Session Button - Moved below header */}
      <div className="flex justify-center mb-6 mt-8">
        <button
          onClick={handleCreateSession}
          className="px-6 py-3 rune-button rounded-lg font-bold text-black text-lg"
        >
          <Plus className="w-5 h-5 mr-2 inline-block" />
          Create New Session
        </button>
      </div>

      {/* Sessions Grid */}
      {loading && !refreshing ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-300">Loading sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-16 h-16 text-amber-600 mx-auto mb-4" />
          <h3 className="fantasy-title text-xl text-amber-300 mb-2">No Sessions Found</h3>
          <p className="text-amber-200 mb-4">
            {searchTerm ? 'Try adjusting your search or filters' : 'Be the first to create an adventure!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => {
            const status = getSessionStatus(session);
            const canJoin = session.is_active && session.current_players < session.max_players;
            const isJoining = joiningSession === session.id;
            
            return (
              <div
                key={session.id}
                className="bg-gradient-to-br from-gray-900 to-gray-800 border border-amber-600/30 rounded-lg p-4 hover:border-amber-500/50 transition-all duration-300 hover:scale-105"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="fantasy-title text-lg font-bold text-amber-300 line-clamp-2">
                    {session.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {session.password_hash && (
                      <Lock className="w-4 h-4 text-amber-400" title="Password protected" />
                    )}
                    <span className={`text-sm font-medium ${status.color}`}>
                      {status.text}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {session.description && (
                  <p className="text-amber-200 text-sm mb-3 line-clamp-3">
                    {session.description}
                  </p>
                )}

                {/* Host Info */}
                <div className="flex items-center mb-3">
                  <Crown className="w-4 h-4 text-amber-400 mr-2" />
                  <span className="text-amber-300 text-sm">
                    Host: {session.host?.display_name || session.host?.username || 'Unknown'}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 text-amber-400 mr-2" />
                    <span className="text-amber-200">
                      {session.current_players}/{session.max_players}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-amber-400 mr-2" />
                    <span className="text-amber-200">
                      Turn {session.current_turn}
                    </span>
                  </div>
                </div>

                {/* Last Activity */}
                <div className="text-xs text-amber-400 mb-3">
                  Updated {formatTimeAgo(session.updated_at)}
                </div>

                {/* Join Button */}
                <button
                  onClick={() => handleJoinSession(session)}
                  disabled={!canJoin || loading || signingOut || isJoining || isLoading}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    canJoin && !loading && !signingOut && !isJoining && !isLoading
                      ? 'rune-button text-black hover:scale-105'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isJoining ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Joining...</span>
                    </div>
                  ) : !session.is_active ? 'Inactive' :
                   session.current_players >= session.max_players ? 'Full' :
                   loading || signingOut ? 'Loading...' :
                   'Join Adventure'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}