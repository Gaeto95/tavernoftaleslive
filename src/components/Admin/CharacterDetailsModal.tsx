import React, { useState } from 'react';
import { 
  Sword, X, RefreshCw, AlertTriangle, User, 
  Heart, Shield, Edit, Trash2, Eye
} from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

interface CharacterDetailsModalProps {
  character: any;
  onClose: () => void;
  onEdit: () => void;
  onRefresh: () => void;
}

export function CharacterDetailsModal({ 
  character, 
  onClose, 
  onEdit,
  onRefresh 
}: CharacterDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'inventory' | 'spells' | 'json'>('stats');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
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
            <div className="p-3 rounded-full bg-amber-500/20 mr-4">
              <Sword className="w-8 h-8 text-amber-400" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{character.name}</h2>
              <p className="text-gray-300">Level {character.level} {character.class_id}</p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 bg-gray-700 rounded-full text-xs text-gray-300">
                  {character.background || 'No background'}
                </span>
                
                <span className="px-2 py-1 bg-gray-700 rounded-full text-xs text-gray-300">
                  ID: {character.id}
                </span>
                
                <span className="px-2 py-1 bg-gray-700 rounded-full text-xs text-gray-300">
                  Created: {formatDate(character.created_at)}
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
        
        {/* Owner Info */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-white font-medium mb-2">Owner</h3>
          
          <div className="flex items-center">
            <User className="w-5 h-5 text-blue-400 mr-2" />
            <span className="text-gray-300">{character.user?.username || 'Unknown'}</span>
            
            {character.user?.display_name && (
              <span className="text-gray-400 ml-2">({character.user.display_name})</span>
            )}
          </div>
        </div>
        
        {/* Basic Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Level</div>
            <div className="text-xl font-bold text-white">{character.level}</div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Experience</div>
            <div className="text-xl font-bold text-white">{character.experience}</div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Hit Points</div>
            <div className="text-xl font-bold text-white flex items-center">
              <Heart className="w-4 h-4 text-red-400 mr-1" />
              {character.hit_points}/{character.max_hit_points}
            </div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Armor Class</div>
            <div className="text-xl font-bold text-white flex items-center">
              <Shield className="w-4 h-4 text-blue-400 mr-1" />
              {character.armor_class}
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={onEdit}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-white transition-colors flex items-center"
          >
            <Edit className="w-4 h-4 mr-2" />
            <span>Edit Character</span>
          </button>
          
          <button
            onClick={onRefresh}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors flex items-center"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-3 font-medium ${
              activeTab === 'stats'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Stats
          </button>
          
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-3 font-medium ${
              activeTab === 'inventory'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Inventory
          </button>
          
          <button
            onClick={() => setActiveTab('spells')}
            className={`px-4 py-3 font-medium ${
              activeTab === 'spells'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Spells
          </button>
          
          <button
            onClick={() => setActiveTab('json')}
            className={`px-4 py-3 font-medium ${
              activeTab === 'json'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Raw Data
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="max-h-96 overflow-y-auto">
          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Character Stats</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {character.stats && Object.entries(character.stats).map(([stat, value]) => (
                  <div key={stat} className="bg-gray-700 rounded-lg p-3">
                    <div className="text-gray-400 text-sm capitalize">{stat}</div>
                    <div className="text-xl font-bold text-white">{value}</div>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Skills */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Skills</h4>
                  
                  {character.skills_data ? (
                    <div className="space-y-2">
                      {Object.entries(character.skills_data).map(([skill, data]: [string, any]) => (
                        <div key={skill} className="flex justify-between">
                          <span className="text-gray-300 capitalize">{skill.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-white">{data.modifier >= 0 ? '+' : ''}{data.modifier}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400">No skill data available</div>
                  )}
                </div>
                
                {/* Saving Throws */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Saving Throws</h4>
                  
                  {character.saving_throws_data ? (
                    <div className="space-y-2">
                      {Object.entries(character.saving_throws_data).map(([ability, data]: [string, any]) => (
                        <div key={ability} className="flex justify-between">
                          <span className="text-gray-300 capitalize">{ability}</span>
                          <span className="text-white">{data.modifier >= 0 ? '+' : ''}{data.modifier}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400">No saving throw data available</div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Inventory</h3>
              
              {character.inventory && character.inventory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {character.inventory.map((item: any, index: number) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-3">
                      <div className="font-medium text-white">{item.name}</div>
                      <div className="text-gray-400 text-sm">{item.description}</div>
                      
                      <div className="flex justify-between mt-2 text-xs">
                        <span className="text-gray-300">Type: {item.type}</span>
                        <span className="text-gray-300 capitalize">Rarity: {item.rarity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  No items in inventory
                </div>
              )}
            </div>
          )}
          
          {/* Spells Tab */}
          {activeTab === 'spells' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Spells</h3>
              
              {character.spells && character.spells.length > 0 ? (
                <div className="space-y-4">
                  {character.spells.map((spell: string, index: number) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-3">
                      <div className="text-white">{spell}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  No spells available
                </div>
              )}
              
              {/* Spell Slots */}
              {character.spell_slots && Object.keys(character.spell_slots).length > 0 && (
                <div className="mt-6">
                  <h4 className="text-white font-medium mb-3">Spell Slots</h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(character.spell_slots).map(([level, slots]: [string, any]) => (
                      <div key={level} className="bg-gray-700 rounded-lg p-3">
                        <div className="text-gray-400 text-sm">
                          {level.replace('level', 'Level ')}
                        </div>
                        <div className="text-white">
                          {slots.current}/{slots.max}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Raw Data Tab */}
          {activeTab === 'json' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Raw Character Data</h3>
              
              <pre className="bg-gray-700 p-4 rounded-lg text-gray-300 text-xs overflow-x-auto">
                {JSON.stringify(character, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}