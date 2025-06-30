import React, { useState, useEffect } from 'react';
import { 
  Sword, X, Save, AlertTriangle, Heart, 
  Shield, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CharacterEditModalProps {
  character: any;
  onClose: () => void;
  onSave: () => void;
}

export function CharacterEditModal({ character, onClose, onSave }: CharacterEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: character.name,
    level: character.level,
    experience: character.experience,
    hit_points: character.hit_points,
    max_hit_points: character.max_hit_points,
    armor_class: character.armor_class,
    background: character.background || '',
    stats: { ...character.stats }
  });

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'level' || name === 'experience' || name === 'hit_points' || 
              name === 'max_hit_points' || name === 'armor_class' 
                ? parseInt(value) 
                : value
    }));
  };

  // Handle stat change
  const handleStatChange = (stat: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [stat]: parseInt(value)
      }
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Update character
      const { error } = await supabase
        .from('characters')
        .update({
          name: formData.name,
          level: formData.level,
          experience: formData.experience,
          hit_points: formData.hit_points,
          max_hit_points: formData.max_hit_points,
          armor_class: formData.armor_class,
          background: formData.background,
          stats: formData.stats
        })
        .eq('id', character.id);
      
      if (error) throw error;
      
      onSave();
    } catch (err) {
      console.error('Error updating character:', err);
      setError('Failed to update character');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-4xl w-full mx-4 my-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          disabled={loading}
        >
          <X className="w-6 h-6" />
        </button>
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center">
            <Sword className="w-6 h-6 text-amber-400 mr-3" />
            <h2 className="text-2xl font-bold text-white">Edit Character</h2>
          </div>
          <p className="text-gray-400 mt-1">ID: {character.id}</p>
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
        
        {/* Edit Form */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Character Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Background
                  </label>
                  <input
                    type="text"
                    name="background"
                    value={formData.background}
                    onChange={handleChange}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Level
                  </label>
                  <input
                    type="number"
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    min="1"
                    max="20"
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Experience
                  </label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    min="0"
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                  />
                </div>
              </div>
            </div>
            
            {/* Stats */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Character Stats</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center">
                    <Heart className="w-4 h-4 text-red-400 mr-1" />
                    Hit Points
                  </label>
                  <input
                    type="number"
                    name="hit_points"
                    value={formData.hit_points}
                    onChange={handleChange}
                    min="0"
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center">
                    <Heart className="w-4 h-4 text-red-400 mr-1" />
                    Max Hit Points
                  </label>
                  <input
                    type="number"
                    name="max_hit_points"
                    value={formData.max_hit_points}
                    onChange={handleChange}
                    min="1"
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center">
                    <Shield className="w-4 h-4 text-blue-400 mr-1" />
                    Armor Class
                  </label>
                  <input
                    type="number"
                    name="armor_class"
                    value={formData.armor_class}
                    onChange={handleChange}
                    min="1"
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                  />
                </div>
              </div>
              
              <h4 className="text-white font-medium mb-2">Ability Scores</h4>
              
              <div className="grid grid-cols-2 gap-4">
                {formData.stats && Object.entries(formData.stats).map(([stat, value]) => (
                  <div key={stat}>
                    <label className="block text-gray-300 text-sm font-medium mb-2 capitalize">
                      {stat}
                    </label>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => handleStatChange(stat, e.target.value)}
                      min="1"
                      max="30"
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-white transition-colors flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}