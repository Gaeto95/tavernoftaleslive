import React, { useState } from 'react';
import { Book, Sparkles, ArrowRight, Plus, Search } from 'lucide-react';
import { StoryPreset } from '../types/game';
import { STORY_PRESETS } from '../data/storyPresets';

interface StoryPresetSelectorProps {
  onSelectPreset: (preset: StoryPreset) => void;
  onCancel: () => void;
}

export function StoryPresetSelector({ onSelectPreset, onCancel }: StoryPresetSelectorProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customPreset, setCustomPreset] = useState<{
    name: string;
    description: string;
    initialStory: string;
  }>({
    name: '',
    description: '',
    initialStory: ''
  });

  // Reorder presets to prioritize the requested order
  const orderedPresets = [...STORY_PRESETS].sort((a, b) => {
    // Custom order: rome first, hobbit, warhammer 40k
    if (a.id === 'historical-rome') return -1;
    if (b.id === 'historical-rome') return 1;
    if (a.id === 'fantasy-hobbit') return -1;
    if (b.id === 'fantasy-hobbit') return 1;
    if (a.id === 'warhammer-40k') return -1;
    if (b.id === 'warhammer-40k') return 1;
    return 0;
  });

  const filteredPresets = orderedPresets.filter(preset => 
    preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    preset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    preset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectPreset = () => {
    const selectedPreset = STORY_PRESETS.find(preset => preset.id === selectedPresetId);
    if (selectedPreset) {
      onSelectPreset(selectedPreset);
    }
  };

  const handleCreateCustomPreset = () => {
    if (!customPreset.name || !customPreset.initialStory) return;
    
    const newCustomPreset: StoryPreset = {
      id: `custom-${Date.now()}`,
      name: customPreset.name,
      description: customPreset.description || 'Your custom adventure',
      systemPrompt: `You are the Storyteller for a custom adventure. Create an immersive experience with:
- Rich descriptions of environments and characters
- Engaging dialogue and interactions
- A balance of action, exploration, and character development
- Opportunities for player choice and agency
- A responsive world that adapts to the player's actions

For each response, include vivid sensory details, interesting NPCs, and a mix of challenges appropriate to the setting.`,
      initialStory: customPreset.initialStory,
      imagePrompt: 'Fantasy adventure scene with detailed environment and atmospheric lighting',
      suggestedActions: [
        'Explore your surroundings',
        'Talk to nearby characters',
        'Check your equipment',
        'Consider your next move'
      ],
      tags: ['custom', 'adventure', 'fantasy']
    };
    
    onSelectPreset(newCustomPreset);
  };

  // Preset icons mapping
  const presetIcons: {[key: string]: string} = {
    'historical-rome': '🏛️',
    'fantasy-hobbit': '🍃',
    'warhammer-40k': '💀',
    'fantasy-adventure': '🐉',
    'sci-fi-exploration': '🚀',
    'cyberpunk-noir': '🌆',
    'horror-mansion': '👻',
    'pirate-adventure': '⚓',
    'wild-west': '🤠'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="parchment-panel p-8 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <h2 className="fantasy-title text-3xl font-bold text-amber-300 mb-2 glow-text">
            Choose Your Adventure
          </h2>
          <p className="text-amber-200 text-lg">
            Select a story preset or create your own custom adventure
          </p>
        </div>

        {showCustomForm ? (
          <div className="max-w-2xl mx-auto">
            <h3 className="fantasy-title text-xl text-amber-300 mb-4">Create Custom Adventure</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-amber-300 text-sm font-medium mb-2">
                  Adventure Name *
                </label>
                <input
                  type="text"
                  value={customPreset.name}
                  onChange={(e) => setCustomPreset({...customPreset, name: e.target.value})}
                  placeholder="Enter a name for your adventure"
                  className="w-full p-3 spell-input rounded-lg text-amber-50"
                  required
                />
              </div>
              
              <div>
                <label className="block text-amber-300 text-sm font-medium mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={customPreset.description}
                  onChange={(e) => setCustomPreset({...customPreset, description: e.target.value})}
                  placeholder="Briefly describe your adventure (optional)"
                  className="w-full p-3 spell-input rounded-lg text-amber-50"
                />
              </div>
              
              <div>
                <label className="block text-amber-300 text-sm font-medium mb-2">
                  Starting Scene *
                </label>
                <textarea
                  value={customPreset.initialStory}
                  onChange={(e) => setCustomPreset({...customPreset, initialStory: e.target.value})}
                  placeholder="Describe the opening scene of your adventure..."
                  className="w-full p-3 spell-input rounded-lg text-amber-50 h-32 resize-none"
                  required
                />
                <p className="text-amber-400 text-xs mt-1">
                  This will be the first scene of your adventure. Be descriptive about the setting, situation, and any immediate challenges.
                </p>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowCustomForm(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 border border-amber-600 rounded-lg text-amber-200 transition-colors"
              >
                Back to Presets
              </button>
              
              <button
                onClick={handleCreateCustomPreset}
                disabled={!customPreset.name || !customPreset.initialStory}
                className="rune-button px-8 py-3 rounded-lg font-bold text-black disabled:opacity-50 flex items-center space-x-2"
              >
                <span>Create & Begin</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="mb-6 flex justify-between items-center">
              <div className="relative max-w-md">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, description, or tags..."
                  className="w-full p-3 pl-10 spell-input rounded-lg text-amber-50"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-400" />
              </div>
              
              <button
                onClick={() => setShowCustomForm(true)}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-600 border border-purple-500 rounded-lg text-white transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Custom Adventure</span>
              </button>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredPresets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`p-6 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
                    selectedPresetId === preset.id
                      ? 'border-amber-400 bg-amber-900/30 shadow-lg shadow-amber-400/20 transform scale-105'
                      : 'border-amber-600/30 hover:border-amber-500 hover:bg-amber-900/20 hover:scale-105'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">{presetIcons[preset.id] || '🎲'}</span>
                      <h3 className="fantasy-title text-xl text-amber-300">{preset.name}</h3>
                    </div>
                    {selectedPresetId === preset.id && (
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  
                  <p className="text-amber-200 text-sm mb-4 line-clamp-3">{preset.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {preset.tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="text-xs bg-amber-900/40 border border-amber-600/30 rounded-full px-2 py-1 text-amber-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {filteredPresets.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Book className="w-16 h-16 text-amber-600/50 mx-auto mb-4" />
                  <p className="text-amber-400 text-lg mb-2">No matching adventures found</p>
                  <p className="text-amber-300 text-sm">Try different search terms</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={onCancel}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 border border-amber-600 rounded-lg text-amber-200 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSelectPreset}
                disabled={!selectedPresetId}
                className="rune-button px-8 py-3 rounded-lg font-bold text-black disabled:opacity-50 flex items-center space-x-2"
              >
                <span>Begin Adventure</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}