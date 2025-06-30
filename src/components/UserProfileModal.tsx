import React, { useState, useEffect } from 'react';
import { User, LogOut, Clock, Sword, Trash2, X, Edit, Save, Camera, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User as AuthUser } from '@supabase/supabase-js';
import { User as AppUser } from '../types/multiplayer';
import { Character } from '../types/character';

interface UserProfileModalProps {
  user: AuthUser;
  profile: AppUser | null;
  onClose: () => void;
  onSignOut: () => Promise<void>;
  onViewCharacter?: (character: Character) => void;
}

export function UserProfileModal({ user, profile, onClose, onSignOut, onViewCharacter }: UserProfileModalProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPlayTime, setTotalPlayTime] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<string | null>(null);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load characters
        const { data: charactersData, error: charactersError } = await supabase
          .from('characters')
          .select('*')
          .eq('user_id', user.id);
          
        if (charactersError) throw charactersError;
        
        // Process characters for display
        const processedCharacters = charactersData.map(char => {
          // Parse JSON fields
          const stats = typeof char.stats === 'string' ? JSON.parse(char.stats) : char.stats;
          const inventory = typeof char.inventory === 'string' ? JSON.parse(char.inventory) : char.inventory;
          
          return {
            id: char.id,
            name: char.name,
            class: {
              id: char.class_id,
              name: char.class_id.charAt(0).toUpperCase() + char.class_id.slice(1),
              description: '',
              hitDie: 8,
              primaryStats: ['strength', 'dexterity'],
              savingThrows: ['strength', 'constitution'],
              skillProficiencies: [],
              startingEquipment: [],
              classFeatures: []
            },
            level: char.level,
            stats: stats,
            hitPoints: char.hit_points,
            maxHitPoints: char.max_hit_points,
            armorClass: char.armor_class,
            proficiencyBonus: char.proficiency_bonus,
            experience: char.experience,
            background: char.background,
            inventory: inventory || [],
            createdAt: new Date(char.created_at).getTime(),
            updatedAt: new Date(char.updated_at).getTime()
          };
        });
        
        setCharacters(processedCharacters);
        
        // Calculate total play time from game states in localStorage
        try {
          const savedGame = localStorage.getItem('ai-dungeon-master-save');
          if (savedGame) {
            const gameState = JSON.parse(savedGame);
            setTotalPlayTime(gameState.gameStats?.totalPlayTime || 0);
          }
        } catch (err) {
          console.warn('Failed to load play time:', err);
        }
        
      } catch (err) {
        console.error('Error loading user data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [user.id]);

  // Format time (hours, minutes)
  const formatPlayTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle profile update
  const handleUpdateProfile = async () => {
    if (!profile) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      const { error } = await supabase
        .from('users')
        .update({
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsSaving(true);
      
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type
        });
        
      if (error) throw error;
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
        
      if (publicUrlData) {
        setAvatarUrl(publicUrlData.publicUrl);
      }
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle character deletion
  const handleDeleteCharacter = async (characterId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', characterId);
        
      if (error) throw error;
      
      // Update local state
      setCharacters(prev => prev.filter(c => c.id !== characterId));
      setShowDeleteConfirm(false);
      setCharacterToDelete(null);
    } catch (err) {
      console.error('Error deleting character:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete character');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="parchment-panel p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-amber-600/30">
          <div className="flex items-center space-x-3">
            <div className="relative">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={profile?.username || 'User'} 
                  className="w-16 h-16 rounded-full object-cover border-2 border-amber-500"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-amber-900/50 border-2 border-amber-500 flex items-center justify-center">
                  <User className="w-8 h-8 text-amber-300" />
                </div>
              )}
              
              {isEditing && (
                <label className="absolute bottom-0 right-0 w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center cursor-pointer">
                  <Camera className="w-3 h-3 text-black" />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleAvatarUpload}
                  />
                </label>
              )}
            </div>
            
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-amber-900/30 border border-amber-600 rounded px-2 py-1 text-amber-100 text-xl font-bold mb-1"
                />
              ) : (
                <h2 className="fantasy-title text-2xl font-bold text-amber-300 mb-1">
                  {profile?.display_name || profile?.username || 'Adventurer'}
                </h2>
              )}
              <p className="text-amber-400 text-sm">
                {profile?.username || user.email}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleUpdateProfile}
                  disabled={isSaving}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors flex items-center space-x-1"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
                
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-white transition-colors flex items-center space-x-1"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-2 text-amber-400 hover:text-amber-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 text-center">
            <Clock className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-amber-300">{formatPlayTime(totalPlayTime)}</div>
            <div className="text-sm text-amber-400">Total Play Time</div>
          </div>
          
          <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 text-center">
            <Sword className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-amber-300">{characters.length}</div>
            <div className="text-sm text-amber-400">Characters</div>
          </div>
          
          <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 text-center">
            <User className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-amber-300">{formatDate(profile?.created_at || user.created_at || '')}</div>
            <div className="text-sm text-amber-400">Joined</div>
          </div>
        </div>

        {/* Characters */}
        <div className="mb-6">
          <h3 className="fantasy-title text-xl text-amber-300 mb-4">Your Characters</h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-amber-300">Loading your characters...</p>
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-8 bg-amber-900/10 border border-amber-600/20 rounded-lg">
              <Sword className="w-12 h-12 text-amber-600/50 mx-auto mb-4" />
              <p className="text-amber-300 mb-2">You haven't created any characters yet</p>
              <p className="text-amber-400 text-sm">Create a character to begin your adventure!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {characters.map((character) => (
                <div 
                  key={character.id}
                  className="bg-amber-900/10 border border-amber-600/30 rounded-lg p-4 hover:bg-amber-900/20 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-amber-200 font-bold text-lg">{character.name}</h4>
                      <p className="text-amber-300 text-sm">
                        Level {character.level} {character.class.name}
                      </p>
                      {character.background && (
                        <p className="text-amber-400 text-xs">{character.background} Background</p>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      {/* Added Eye icon for viewing character details */}
                      {onViewCharacter && (
                        <button
                          onClick={() => onViewCharacter(character)}
                          className="p-1 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                          title="View character details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          setCharacterToDelete(character.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-1 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                        title="Delete character"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center p-1 bg-red-900/20 border border-red-600/30 rounded">
                      <div className="text-red-300 text-xs">HP</div>
                      <div className="text-red-200 text-sm font-bold">{character.hitPoints}/{character.maxHitPoints}</div>
                    </div>
                    
                    <div className="text-center p-1 bg-blue-900/20 border border-blue-600/30 rounded">
                      <div className="text-blue-300 text-xs">AC</div>
                      <div className="text-blue-200 text-sm font-bold">{character.armorClass}</div>
                    </div>
                    
                    <div className="text-center p-1 bg-amber-900/20 border border-amber-600/30 rounded">
                      <div className="text-amber-300 text-xs">XP</div>
                      <div className="text-amber-200 text-sm font-bold">{character.experience}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 border-2 border-red-600 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl text-red-300 mb-4">Delete Character?</h3>
              <p className="text-amber-100 mb-6">
                Are you sure you want to delete this character? This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setCharacterToDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={() => {
                    if (characterToDelete) {
                      handleDeleteCharacter(characterToDelete);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-amber-600/30 flex justify-between items-center">
          <button
            onClick={onSignOut}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-700 hover:bg-amber-600 rounded-lg text-black font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}