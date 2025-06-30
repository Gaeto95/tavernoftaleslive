import React, { useState, useEffect, useRef } from 'react';
import { User, Clock, Sword, Trash2, LogOut, AlertTriangle, X, Shield, Upload, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Character } from '../types/character';
import { Character3DViewer } from './3D/Character3DViewer';

interface UserProfileProps {
  onClose: () => void;
  onSignOut: () => void;
  onViewCharacter?: (character: Character) => void;
  onDeleteCharacter?: (characterId: string) => void;
}

export function UserProfile({ onClose, onSignOut, onViewCharacter, onDeleteCharacter }: UserProfileProps) {
  const [user, setUser] = useState<any>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalGameTime: 0,
    sessionsJoined: 0,
    charactersCreated: 0
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Not logged in');
        setLoading(false);
        return;
      }
      
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      
      setUser({
        ...user,
        ...profile
      });
      
      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      }
      
      // Get user's characters
      const { data: charactersData, error: charactersError } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
        
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
      
      // Get user stats
      const { data: sessionData, error: sessionError } = await supabase
        .from('session_players')
        .select('session_id, joined_at')
        .eq('user_id', user.id);
        
      if (sessionError) throw sessionError;
      
      // Calculate total game time (estimate based on sessions)
      const totalGameTime = sessionData ? sessionData.length * 60 * 60 * 1000 : 0; // Rough estimate: 1 hour per session
      
      setStats({
        totalGameTime,
        sessionsJoined: sessionData ? sessionData.length : 0,
        charactersCreated: charactersData ? charactersData.length : 0
      });
      
    } catch (err) {
      console.error('Error loading user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!characterId) return;
    
    try {
      setLoading(true);
      
      // Delete character
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', characterId);
        
      if (error) throw error;
      
      // Update local state
      setCharacters(characters.filter(c => c.id !== characterId));
      setStats(prev => ({
        ...prev,
        charactersCreated: prev.charactersCreated - 1
      }));
      
      setCharacterToDelete(null);
      setShowDeleteConfirm(false);
      
      // Call parent handler if provided
      if (onDeleteCharacter) {
        onDeleteCharacter(characterId);
      }
    } catch (err) {
      console.error('Error deleting character:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete character');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    try {
      setUploadingAvatar(true);
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: publicUrl } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      if (!publicUrl) throw new Error('Failed to get public URL');
      
      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl.publicUrl })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      // Update local state
      setAvatarUrl(publicUrl.publicUrl);
      
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const formatGameTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-4xl w-full mx-4 my-8">
        <div className="parchment-panel p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-amber-600/30">
            <div className="flex items-center space-x-3">
              <div className="relative">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={user?.username} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-amber-500"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-amber-900/50 border-2 border-amber-500 flex items-center justify-center">
                    <User className="w-6 h-6 text-amber-400" />
                  </div>
                )}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1 bg-amber-600 rounded-full text-black hover:bg-amber-500 transition-colors"
                  title="Upload avatar"
                >
                  <Camera className="w-3 h-3" />
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <div>
                <h2 className="fantasy-title text-2xl font-bold text-amber-300 glow-text">
                  Adventurer Profile
                </h2>
                {user && (
                  <p className="text-amber-200">
                    {user.display_name || user.username}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-6">
              <p className="text-red-200 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
                {error}
              </p>
              <button
                onClick={loadUserData}
                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* User Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-1 bg-amber-900/20 border border-amber-600/30 rounded-lg p-4">
                  <h3 className="fantasy-title text-lg text-amber-300 mb-3">Account Info</h3>
                  <div className="space-y-2">
                    <p className="text-amber-200">
                      <span className="text-amber-400 font-medium">Username:</span> {user?.username}
                    </p>
                    <p className="text-amber-200">
                      <span className="text-amber-400 font-medium">Display Name:</span> {user?.display_name || 'Not set'}
                    </p>
                    <p className="text-amber-200">
                      <span className="text-amber-400 font-medium">Joined:</span> {formatDate(user?.created_at)}
                    </p>
                    <p className="text-amber-200">
                      <span className="text-amber-400 font-medium">Last Seen:</span> {formatDate(user?.last_seen)}
                    </p>
                    {user?.role && (
                      <p className="text-amber-200">
                        <span className="text-amber-400 font-medium">Role:</span> {user.role}
                      </p>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 bg-amber-900/20 border border-amber-600/30 rounded-lg p-4">
                  <h3 className="fantasy-title text-lg text-amber-300 mb-3">Adventure Stats</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-amber-900/30 border border-amber-600/40 rounded-lg">
                      <Clock className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                      <div className="text-xl font-bold text-amber-300">{formatGameTime(stats.totalGameTime)}</div>
                      <div className="text-amber-400 text-sm">Total Game Time</div>
                    </div>
                    <div className="text-center p-3 bg-amber-900/30 border border-amber-600/40 rounded-lg">
                      <Sword className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                      <div className="text-xl font-bold text-amber-300">{stats.charactersCreated}</div>
                      <div className="text-amber-400 text-sm">Characters Created</div>
                    </div>
                    <div className="text-center p-3 bg-amber-900/30 border border-amber-600/40 rounded-lg">
                      <Shield className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                      <div className="text-xl font-bold text-amber-300">{stats.sessionsJoined}</div>
                      <div className="text-amber-400 text-sm">Sessions Joined</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Characters */}
              <div className="mb-8">
                <h3 className="fantasy-title text-xl text-amber-300 mb-4">Your Characters</h3>
                {characters.length === 0 ? (
                  <div className="text-center py-8 bg-amber-900/10 border border-amber-600/20 rounded-lg">
                    <p className="text-amber-400">You haven't created any characters yet.</p>
                    <p className="text-amber-300 mt-2">Create a character to begin your adventure!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {characters.map(character => (
                      <div 
                        key={character.id}
                        className="bg-amber-900/10 border border-amber-600/30 rounded-lg overflow-hidden hover:border-amber-500 transition-all duration-300 hover:shadow-lg hover:shadow-amber-600/20"
                      >
                        <div className="h-40 relative">
                          <Character3DViewer 
                            className="absolute inset-0" 
                            rotate={true} 
                          />
                        </div>
                        <div className="p-4">
                          <h4 className="fantasy-title text-lg text-amber-300 mb-1">{character.name}</h4>
                          <p className="text-amber-200 text-sm">
                            Level {character.level} {character.class.name}
                          </p>
                          <p className="text-amber-400 text-xs mb-3">
                            {character.background || 'No background'}
                          </p>
                          
                          <div className="flex justify-between items-center">
                            <div className="text-xs text-amber-400">
                              Created: {new Date(character.createdAt).toLocaleDateString()}
                            </div>
                            <div className="flex space-x-2">
                              {onViewCharacter && (
                                <button
                                  onClick={() => onViewCharacter(character)}
                                  className="p-1 bg-amber-600 hover:bg-amber-700 rounded text-black transition-colors"
                                  title="View character"
                                >
                                  <User className="w-4 h-4" />
                                </button>
                              )}
                              {onDeleteCharacter && (
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
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Account Actions */}
              <div className="border-t border-amber-600/30 pt-6 flex justify-between">
                <div>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-amber-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={onSignOut}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-black font-medium transition-colors flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="bg-gray-900 border-2 border-amber-600 rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl text-amber-300 mb-4">Confirm Deletion</h3>
                <p className="text-amber-100 mb-6">
                  Are you sure you want to delete this character? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setCharacterToDelete(null);
                      setShowDeleteConfirm(false);
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => characterToDelete && handleDeleteCharacter(characterToDelete)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
                  >
                    Delete Character
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}