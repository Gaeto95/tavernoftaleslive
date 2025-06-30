import React, { useState, useEffect } from 'react';
import { 
  Sword, Search, RefreshCw, Filter, ChevronDown, 
  ChevronUp, Trash2, Eye, Edit, AlertTriangle, User,
  Shield, Heart, Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { CharacterDetailsModal } from './CharacterDetailsModal';
import { CharacterEditModal } from './CharacterEditModal';
import { ConfirmationModal } from './ConfirmationModal';

export function CharactersPanel() {
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('updated_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCharacter, setSelectedCharacter] = useState<any | null>(null);
  const [showCharacterDetails, setShowCharacterDetails] = useState(false);
  const [showCharacterEdit, setShowCharacterEdit] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  // Load characters
  const loadCharacters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('characters')
        .select(`
          *,
          active_session:game_sessions(id, name)
        `);
      
      // Apply search filter
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,class_id.ilike.%${searchTerm}%`);
      }
      
      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });
      
      const { data: charactersData, error: queryError } = await query;
      
      if (queryError) throw queryError;
      
      if (!charactersData || charactersData.length === 0) {
        setCharacters([]);
        return;
      }
      
      // Get unique user IDs
      const userIds = [...new Set(charactersData.map(char => char.user_id).filter(Boolean))];
      
      // Fetch user data separately
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, display_name')
        .in('id', userIds);
      
      if (usersError) {
        console.warn('Error fetching user data:', usersError);
        // Continue without user data rather than failing completely
      }
      
      // Create a map of user data for quick lookup
      const usersMap = new Map();
      if (usersData) {
        usersData.forEach(user => {
          usersMap.set(user.id, user);
        });
      }
      
      // Combine character data with user data
      const charactersWithUsers = charactersData.map(character => ({
        ...character,
        user: character.user_id ? usersMap.get(character.user_id) : null
      }));
      
      setCharacters(charactersWithUsers);
    } catch (err) {
      console.error('Error loading characters:', err);
      setError('Failed to load characters');
    } finally {
      setLoading(false);
    }
  };

  // Load characters on mount and when filters change
  useEffect(() => {
    loadCharacters();
  }, [sortField, sortDirection]);

  // Handle search
  const handleSearch = () => {
    loadCharacters();
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

  // View character details
  const viewCharacterDetails = (character: any) => {
    setSelectedCharacter(character);
    setShowCharacterDetails(true);
  };

  // Edit character
  const editCharacter = (character: any) => {
    setSelectedCharacter(character);
    setShowCharacterEdit(true);
  };

  // Delete character
  const confirmDeleteCharacter = (character: any) => {
    setSelectedCharacter(character);
    setConfirmationAction({
      title: 'Delete Character',
      message: `Are you sure you want to permanently delete the character "${character.name}"? This action cannot be undone.`,
      action: async () => {
        try {
          // Delete the character
          const { error } = await supabase
            .from('characters')
            .delete()
            .eq('id', character.id);
          
          if (error) throw error;
          
          // Reload characters
          await loadCharacters();
        } catch (err) {
          console.error('Error deleting character:', err);
          setError('Failed to delete character');
        } finally {
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  // Reset character stats
  const confirmResetCharacter = (character: any) => {
    setSelectedCharacter(character);
    setConfirmationAction({
      title: 'Reset Character',
      message: `Are you sure you want to reset "${character.name}" to level 1? This will reset all stats, inventory, and progress.`,
      action: async () => {
        try {
          // Call RPC function to reset character
          const { error } = await supabase.rpc('reset_character_stats', {
            character_uuid: character.id
          });
          
          if (error) throw error;
          
          // Reload characters
          await loadCharacters();
        } catch (err) {
          console.error('Error resetting character:', err);
          setError('Failed to reset character');
        } finally {
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  return (
    <div>
      {/* Character Details Modal */}
      {showCharacterDetails && selectedCharacter && (
        <CharacterDetailsModal
          character={selectedCharacter}
          onClose={() => setShowCharacterDetails(false)}
          onEdit={() => {
            setShowCharacterDetails(false);
            setShowCharacterEdit(true);
          }}
          onRefresh={loadCharacters}
        />
      )}
      
      {/* Character Edit Modal */}
      {showCharacterEdit && selectedCharacter && (
        <CharacterEditModal
          character={selectedCharacter}
          onClose={() => setShowCharacterEdit(false)}
          onSave={async () => {
            setShowCharacterEdit(false);
            await loadCharacters();
          }}
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
          <Sword className="w-5 h-5 mr-2 text-amber-400" />
          Characters
        </h2>
        
        <button
          onClick={loadCharacters}
          className="p-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-white"
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
              placeholder="Search characters..."
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
      
      {/* Characters Table */}
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
              <th className="p-3 text-gray-300 font-medium">Owner</th>
              <th className="p-3 text-gray-300 font-medium">Class</th>
              <th className="p-3 text-gray-300 font-medium">
                <button 
                  onClick={() => handleSortChange('level')}
                  className="flex items-center"
                >
                  Level
                  {sortField === 'level' && (
                    sortDirection === 'asc' ? 
                    <ChevronUp className="w-4 h-4 ml-1" /> : 
                    <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </button>
              </th>
              <th className="p-3 text-gray-300 font-medium">Stats</th>
              <th className="p-3 text-gray-300 font-medium">Active Session</th>
              <th className="p-3 text-gray-300 font-medium">
                <button 
                  onClick={() => handleSortChange('updated_at')}
                  className="flex items-center"
                >
                  Last Updated
                  {sortField === 'updated_at' && (
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
                <td colSpan={8} className="p-4 text-center text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading characters...
                </td>
              </tr>
            ) : characters.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-400">
                  No characters found
                </td>
              </tr>
            ) : (
              characters.map((character) => (
                <tr key={character.id} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="p-3">
                    <div className="font-medium text-white">{character.name}</div>
                    <div className="text-sm text-gray-400">{character.background || 'No background'}</div>
                  </td>
                  <td className="p-3 text-gray-300">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1 text-blue-400" />
                      <span>{character.user?.username || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-300">
                    <span className="capitalize">{character.class_id}</span>
                  </td>
                  <td className="p-3 text-gray-300">
                    {character.level}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        <Heart className="w-4 h-4 text-red-400 mr-1" />
                        <span className="text-gray-300">{character.hit_points}/{character.max_hit_points}</span>
                      </div>
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 text-blue-400 mr-1" />
                        <span className="text-gray-300">{character.armor_class}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    {character.active_session ? (
                      <span className="text-green-400">{character.active_session.name}</span>
                    ) : (
                      <span className="text-gray-500">None</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-300">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                      <span>{formatDate(character.updated_at)}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewCharacterDetails(character)}
                        className="p-1 text-blue-400 hover:text-blue-300"
                        title="View details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => editCharacter(character)}
                        className="p-1 text-amber-400 hover:text-amber-300"
                        title="Edit character"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => confirmResetCharacter(character)}
                        className="p-1 text-yellow-400 hover:text-yellow-300"
                        title="Reset character"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => confirmDeleteCharacter(character)}
                        className="p-1 text-red-400 hover:text-red-300"
                        title="Delete character"
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