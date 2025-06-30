import React, { useState, useEffect } from 'react';
import { 
  Clock, Users, Play, Pause, Trash2, Eye, 
  RefreshCw, Search, Filter, ChevronDown, ChevronUp,
  CheckCircle, XCircle, AlertTriangle, Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SessionDetailsModal } from './SessionDetailsModal';
import { ConfirmationModal } from './ConfirmationModal';

export function SessionsPanel() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState(true);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  // Load sessions
  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('game_sessions')
        .select(`
          *,
          host:users!host_id(*),
          current_players:session_players(count)
        `);
      
      // Apply active filter
      if (filterActive) {
        query = query.eq('is_active', true);
      }
      
      // Apply search filter
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      
      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });
      
      const { data, error: queryError } = await query;
      
      if (queryError) throw queryError;
      
      // Process the data to get the current_players count
      const processedData = data?.map(session => ({
        ...session,
        current_players_count: session.current_players?.[0]?.count || 0
      }));
      
      setSessions(processedData || []);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  // Load sessions on mount and when filters change
  useEffect(() => {
    loadSessions();
  }, [filterActive, sortField, sortDirection]);

  // Handle search
  const handleSearch = () => {
    loadSessions();
  };

  // Handle sort change
  const handleSortChange = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Get status badge
  const getStatusBadge = (session: any) => {
    if (!session.is_active) {
      return (
        <span className="px-2 py-1 bg-gray-600 text-gray-200 rounded-full text-xs">
          Inactive
        </span>
      );
    }
    
    switch (session.turn_phase) {
      case 'waiting':
        return (
          <span className="px-2 py-1 bg-yellow-600/30 text-yellow-300 border border-yellow-600 rounded-full text-xs">
            Waiting
          </span>
        );
      case 'collecting':
        return (
          <span className="px-2 py-1 bg-green-600/30 text-green-300 border border-green-600 rounded-full text-xs">
            Collecting
          </span>
        );
      case 'processing':
        return (
          <span className="px-2 py-1 bg-blue-600/30 text-blue-300 border border-blue-600 rounded-full text-xs">
            Processing
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-1 bg-purple-600/30 text-purple-300 border border-purple-600 rounded-full text-xs">
            Completed
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-600 text-gray-200 rounded-full text-xs">
            Unknown
          </span>
        );
    }
  };

  // View session details
  const viewSessionDetails = (session: any) => {
    setSelectedSession(session);
    setShowSessionDetails(true);
  };

  // End session
  const confirmEndSession = (session: any) => {
    setSelectedSession(session);
    setConfirmationAction({
      title: 'End Session',
      message: `Are you sure you want to end the session "${session.name}"? This will remove all players and mark the session as inactive.`,
      action: async () => {
        try {
          // Call RPC function to force end the session
          const { error } = await supabase.rpc('force_end_session', {
            session_uuid: session.id
          });
          
          if (error) throw error;
          
          // Reload sessions
          await loadSessions();
        } catch (err) {
          console.error('Error ending session:', err);
          setError('Failed to end session');
        } finally {
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  // Delete session
  const confirmDeleteSession = (session: any) => {
    setSelectedSession(session);
    setConfirmationAction({
      title: 'Delete Session',
      message: `Are you sure you want to permanently delete the session "${session.name}"? This action cannot be undone.`,
      action: async () => {
        try {
          // Delete the session
          const { error } = await supabase
            .from('game_sessions')
            .delete()
            .eq('id', session.id);
          
          if (error) throw error;
          
          // Reload sessions
          await loadSessions();
        } catch (err) {
          console.error('Error deleting session:', err);
          setError('Failed to delete session');
        } finally {
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  // Change session phase
  const changeSessionPhase = async (session: any, newPhase: string) => {
    try {
      // Call RPC function to change session phase
      const { error } = await supabase.rpc('change_session_phase', {
        session_uuid: session.id,
        new_phase: newPhase
      });
      
      if (error) throw error;
      
      // Reload sessions
      await loadSessions();
    } catch (err) {
      console.error('Error changing session phase:', err);
      setError('Failed to change session phase');
    }
  };

  return (
    <div>
      {/* Session Details Modal */}
      {showSessionDetails && selectedSession && (
        <SessionDetailsModal
          session={selectedSession}
          onClose={() => setShowSessionDetails(false)}
          onRefresh={loadSessions}
        />
      )}
      
      {/* Confirmation Modal */}
      {showConfirmation && confirmationAction && (
        <ConfirmationModal
          title={confirmationAction.title}
          message={confirmationAction.message}
          onConfirm={confirmationAction.action}
          onCancel={() => setShowConfirmation(false)}
        />
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center">
          <Clock className="w-5 h-5 mr-2 text-blue-400" />
          Game Sessions
        </h2>
        
        <button
          onClick={loadSessions}
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          disabled={loading}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sessions..."
              className="w-full p-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <button
              onClick={handleSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 text-gray-300">
            <input
              type="checkbox"
              checked={filterActive}
              onChange={(e) => setFilterActive(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
            />
            <span>Active only</span>
          </label>
          
          <div className="relative">
            <button
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              <span>Sort</span>
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>
            
            {/* Sort dropdown would go here */}
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
      
      {/* Sessions Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-700 text-left">
              <th className="p-3 text-gray-300 font-medium">
                <button 
                  onClick={() => handleSortChange('name')}
                  className="flex items-center"
                >
                  Name
                  {sortField === 'name' && (
                    sortDirection === 'asc' ? 
                    <ChevronUp className="w-4 h-4 ml-1" /> : 
                    <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </button>
              </th>
              <th className="p-3 text-gray-300 font-medium">Host</th>
              <th className="p-3 text-gray-300 font-medium">Players</th>
              <th className="p-3 text-gray-300 font-medium">Status</th>
              <th className="p-3 text-gray-300 font-medium">
                <button 
                  onClick={() => handleSortChange('created_at')}
                  className="flex items-center"
                >
                  Created
                  {sortField === 'created_at' && (
                    sortDirection === 'asc' ? 
                    <ChevronUp className="w-4 h-4 ml-1" /> : 
                    <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </button>
              </th>
              <th className="p-3 text-gray-300 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading sessions...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-400">
                  No sessions found
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="p-3">
                    <div className="font-medium text-white">{session.name}</div>
                    <div className="text-sm text-gray-400 truncate max-w-xs">{session.description}</div>
                  </td>
                  <td className="p-3 text-gray-300">
                    {session.host?.username || 'Unknown'}
                  </td>
                  <td className="p-3 text-gray-300">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1 text-blue-400" />
                      <span>{session.current_players_count}/{session.max_players}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {getStatusBadge(session)}
                  </td>
                  <td className="p-3 text-gray-300">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                      <span>{formatDate(session.created_at)}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewSessionDetails(session)}
                        className="p-1 text-blue-400 hover:text-blue-300"
                        title="View details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      
                      {session.is_active && (
                        <button
                          onClick={() => confirmEndSession(session)}
                          className="p-1 text-yellow-400 hover:text-yellow-300"
                          title="End session"
                        >
                          <Pause className="w-5 h-5" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => confirmDeleteSession(session)}
                        className="p-1 text-red-400 hover:text-red-300"
                        title="Delete session"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}