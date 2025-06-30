import React, { useState, useEffect } from 'react';
import { 
  Users, User, Search, RefreshCw, Filter, ChevronDown, 
  ChevronUp, Trash2, Eye, AlertTriangle, Ban, Calendar,
  CheckCircle, XCircle, Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PlayerDetailsModal } from './PlayerDetailsModal';
import { ConfirmationModal } from './ConfirmationModal';

export function PlayersPanel() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('last_seen');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  // Load players
  const loadPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('users')
        .select(`
          *,
          characters(count),
          session_players(count)
        `);
      
      // Apply search filter
      if (searchTerm) {
        query = query.or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`);
      }
      
      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });
      
      const { data, error: queryError } = await query;
      
      if (queryError) throw queryError;
      
      // Process the data to get counts
      const processedData = data?.map(player => ({
        ...player,
        characters_count: player.characters?.[0]?.count || 0,
        sessions_count: player.session_players?.[0]?.count || 0,
        is_online: new Date(player.last_seen).getTime() > Date.now() - 15 * 60 * 1000 // 15 minutes
      }));
      
      setPlayers(processedData || []);
    } catch (err) {
      console.error('Error loading players:', err);
      setError('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  // Load players on mount and when filters change
  useEffect(() => {
    loadPlayers();
  }, [sortField, sortDirection]);

  // Handle search
  const handleSearch = () => {
    loadPlayers();
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

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays}d ago`;
      
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths}mo ago`;
    } catch (e) {
      return 'Unknown';
    }
  };

  // View player details
  const viewPlayerDetails = (player: any) => {
    setSelectedPlayer(player);
    setShowPlayerDetails(true);
  };

  // Delete player
  const confirmDeletePlayer = (player: any) => {
    setSelectedPlayer(player);
    setConfirmationAction({
      title: 'Delete Player',
      message: `Are you sure you want to permanently delete the player "${player.username}"? This will delete all their characters and remove them from all sessions.`,
      action: async () => {
        try {
          // Call RPC function to delete user and all associated data
          const { error } = await supabase.rpc('delete_user_and_data', {
            user_uuid: player.id
          });
          
          if (error) throw error;
          
          // Reload players
          await loadPlayers();
        } catch (err) {
          console.error('Error deleting player:', err);
          setError('Failed to delete player');
        } finally {
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  // Ban player
  const confirmBanPlayer = (player: any) => {
    setSelectedPlayer(player);
    setConfirmationAction({
      title: 'Ban Player',
      message: `Are you sure you want to ban the player "${player.username}"? This will prevent them from logging in.`,
      action: async () => {
        try {
          // Update user role to 'banned'
          const { error } = await supabase
            .from('users')
            .update({ role: 'banned' })
            .eq('id', player.id);
          
          if (error) throw error;
          
          // Reload players
          await loadPlayers();
        } catch (err) {
          console.error('Error banning player:', err);
          setError('Failed to ban player');
        } finally {
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  return (
    <div>
      {/* Player Details Modal */}
      {showPlayerDetails && selectedPlayer && (
        <PlayerDetailsModal
          player={selectedPlayer}
          onClose={() => setShowPlayerDetails(false)}
          onRefresh={loadPlayers}
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
          <Users className="w-5 h-5 mr-2 text-green-400" />
          Players
        </h2>
        
        <button
          onClick={loadPlayers}
          className="p-2 bg-green-600 hover:bg-green-700 rounded-lg text-white"
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
              placeholder="Search players..."
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
          <div className="relative">
            <button
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              <span>Filter</span>
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>
            
            {/* Filter dropdown would go here */}
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
      
      {/* Players Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-700 text-left">
              <th className="p-3 text-gray-300 font-medium">
                <button 
                  onClick={() => handleSortChange('username')}
                  className="flex items-center"
                >
                  Username
                  {sortField === 'username' && (
                    sortDirection === 'asc' ? 
                    <ChevronUp className="w-4 h-4 ml-1" /> : 
                    <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </button>
              </th>
              <th className="p-3 text-gray-300 font-medium">Role</th>
              <th className="p-3 text-gray-300 font-medium">Characters</th>
              <th className="p-3 text-gray-300 font-medium">Sessions</th>
              <th className="p-3 text-gray-300 font-medium">
                <button 
                  onClick={() => handleSortChange('last_seen')}
                  className="flex items-center"
                >
                  Last Seen
                  {sortField === 'last_seen' && (
                    sortDirection === 'asc' ? 
                    <ChevronUp className="w-4 h-4 ml-1" /> : 
                    <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </button>
              </th>
              <th className="p-3 text-gray-300 font-medium">Status</th>
              <th className="p-3 text-gray-300 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading players...
                </td>
              </tr>
            ) : players.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-400">
                  No players found
                </td>
              </tr>
            ) : (
              players.map((player) => (
                <tr key={player.id} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="p-3">
                    <div className="font-medium text-white">{player.username}</div>
                    <div className="text-sm text-gray-400">{player.display_name || player.username}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      player.role === 'admin' 
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-600' 
                        : player.role === 'banned'
                        ? 'bg-red-600/30 text-red-300 border border-red-600'
                        : 'bg-blue-600/30 text-blue-300 border border-blue-600'
                    }`}>
                      {player.role || 'user'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-300">
                    {player.characters_count}
                  </td>
                  <td className="p-3 text-gray-300">
                    {player.sessions_count}
                  </td>
                  <td className="p-3 text-gray-300">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1 text-gray-400" />
                      <span>{formatTimeAgo(player.last_seen)}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {player.is_online ? (
                      <span className="flex items-center text-green-400">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Online
                      </span>
                    ) : (
                      <span className="flex items-center text-gray-400">
                        <XCircle className="w-4 h-4 mr-1" />
                        Offline
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewPlayerDetails(player)}
                        className="p-1 text-blue-400 hover:text-blue-300"
                        title="View details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      
                      {player.role !== 'banned' && (
                        <button
                          onClick={() => confirmBanPlayer(player)}
                          className="p-1 text-yellow-400 hover:text-yellow-300"
                          title="Ban player"
                        >
                          <Ban className="w-5 h-5" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => confirmDeletePlayer(player)}
                        className="p-1 text-red-400 hover:text-red-300"
                        title="Delete player"
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