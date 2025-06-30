import React, { useState } from 'react';
import { Book, Map, Users, Bookmark, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { WorldMemory } from '../types/game';

interface WorldMemoryLogProps {
  worldMemory: WorldMemory;
  onClose: () => void;
}

export function WorldMemoryLog({ worldMemory, onClose }: WorldMemoryLogProps) {
  const [activeTab, setActiveTab] = useState<'locations' | 'npcs' | 'decisions' | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const filteredLocations = Object.entries(worldMemory.exploredLocations).filter(([id, location]) => {
    return id.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredNPCs = Object.entries(worldMemory.knownNPCs).filter(([id, npc]) => {
    return npc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           npc.description.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredDecisions = worldMemory.playerDecisions.filter(decision => {
    return decision.decision.toLowerCase().includes(searchTerm.toLowerCase()) || 
           decision.consequence.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="parchment-panel p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-amber-600/30">
          <div className="flex items-center space-x-3">
            <Book className="w-6 h-6 text-amber-400" />
            <h2 className="fantasy-title text-2xl font-bold text-amber-300">
              World Memory
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-amber-400 hover:text-amber-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search and Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-amber-600 text-black'
                  : 'bg-amber-900/20 text-amber-300 hover:bg-amber-900/40'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('locations')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                activeTab === 'locations'
                  ? 'bg-amber-600 text-black'
                  : 'bg-amber-900/20 text-amber-300 hover:bg-amber-900/40'
              }`}
            >
              <Map className="w-4 h-4 mr-1" />
              <span>Locations</span>
            </button>
            <button
              onClick={() => setActiveTab('npcs')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                activeTab === 'npcs'
                  ? 'bg-amber-600 text-black'
                  : 'bg-amber-900/20 text-amber-300 hover:bg-amber-900/40'
              }`}
            >
              <Users className="w-4 h-4 mr-1" />
              <span>NPCs</span>
            </button>
            <button
              onClick={() => setActiveTab('decisions')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                activeTab === 'decisions'
                  ? 'bg-amber-600 text-black'
                  : 'bg-amber-900/20 text-amber-300 hover:bg-amber-900/40'
              }`}
            >
              <Bookmark className="w-4 h-4 mr-1" />
              <span>Decisions</span>
            </button>
          </div>

          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search memories..."
              className="w-full sm:w-64 p-2 pl-9 spell-input rounded-lg text-amber-50 text-sm"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-400" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Locations */}
          {(activeTab === 'all' || activeTab === 'locations') && (
            <div className="mb-6">
              <h3 className="fantasy-title text-lg text-amber-300 mb-3 flex items-center">
                <Map className="w-5 h-5 mr-2" />
                Explored Locations ({filteredLocations.length})
              </h3>
              
              {filteredLocations.length > 0 ? (
                <div className="space-y-3">
                  {filteredLocations.map(([locationId, location]) => (
                    <div 
                      key={locationId}
                      className="bg-amber-900/10 border border-amber-600/30 rounded-lg overflow-hidden"
                    >
                      <div 
                        className="p-3 flex justify-between items-center cursor-pointer hover:bg-amber-900/20"
                        onClick={() => toggleSection(`location-${locationId}`)}
                      >
                        <div>
                          <h4 className="text-amber-200 font-medium">{locationId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                          <div className="text-xs text-amber-400">
                            Visited {location.visitCount} times • Last visit: {formatTimestamp(location.lastVisitTimestamp)}
                          </div>
                        </div>
                        {expandedSections[`location-${locationId}`] ? (
                          <ChevronUp className="w-5 h-5 text-amber-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                      
                      {expandedSections[`location-${locationId}`] && (
                        <div className="p-3 pt-0 border-t border-amber-600/20">
                          <div className="mt-2">
                            <h5 className="text-amber-300 text-xs font-medium mb-1">Notes:</h5>
                            <p className="text-amber-100 text-sm">{location.notes || "No notes recorded."}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-amber-900/10 border border-amber-600/30 rounded-lg">
                  <p className="text-amber-400">No locations found{searchTerm ? ' matching your search' : ''}.</p>
                </div>
              )}
            </div>
          )}

          {/* NPCs */}
          {(activeTab === 'all' || activeTab === 'npcs') && (
            <div className="mb-6">
              <h3 className="fantasy-title text-lg text-amber-300 mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Known NPCs ({filteredNPCs.length})
              </h3>
              
              {filteredNPCs.length > 0 ? (
                <div className="space-y-3">
                  {filteredNPCs.map(([npcId, npc]) => (
                    <div 
                      key={npcId}
                      className="bg-amber-900/10 border border-amber-600/30 rounded-lg overflow-hidden"
                    >
                      <div 
                        className="p-3 flex justify-between items-center cursor-pointer hover:bg-amber-900/20"
                        onClick={() => toggleSection(`npc-${npcId}`)}
                      >
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            npc.attitude === 'friendly' ? 'bg-green-400' :
                            npc.attitude === 'neutral' ? 'bg-blue-400' :
                            'bg-red-400'
                          }`}></div>
                          <div>
                            <h4 className="text-amber-200 font-medium">{npc.name}</h4>
                            <div className="text-xs text-amber-400">
                              {npc.isAlive ? 'Alive' : 'Deceased'} • Last seen in {npc.location}
                            </div>
                          </div>
                        </div>
                        {expandedSections[`npc-${npcId}`] ? (
                          <ChevronUp className="w-5 h-5 text-amber-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                      
                      {expandedSections[`npc-${npcId}`] && (
                        <div className="p-3 pt-0 border-t border-amber-600/20">
                          <div className="mt-2">
                            <h5 className="text-amber-300 text-xs font-medium mb-1">Description:</h5>
                            <p className="text-amber-100 text-sm">{npc.description}</p>
                          </div>
                          <div className="mt-2">
                            <h5 className="text-amber-300 text-xs font-medium mb-1">Last Interaction:</h5>
                            <p className="text-amber-100 text-sm italic">"{npc.lastInteraction}"</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-amber-900/10 border border-amber-600/30 rounded-lg">
                  <p className="text-amber-400">No NPCs found{searchTerm ? ' matching your search' : ''}.</p>
                </div>
              )}
            </div>
          )}

          {/* Decisions */}
          {(activeTab === 'all' || activeTab === 'decisions') && (
            <div className="mb-6">
              <h3 className="fantasy-title text-lg text-amber-300 mb-3 flex items-center">
                <Bookmark className="w-5 h-5 mr-2" />
                Key Decisions ({filteredDecisions.length})
              </h3>
              
              {filteredDecisions.length > 0 ? (
                <div className="space-y-3">
                  {filteredDecisions.map((decision) => (
                    <div 
                      key={decision.id}
                      className="bg-amber-900/10 border border-amber-600/30 rounded-lg overflow-hidden"
                    >
                      <div 
                        className="p-3 flex justify-between items-center cursor-pointer hover:bg-amber-900/20"
                        onClick={() => toggleSection(`decision-${decision.id}`)}
                      >
                        <div>
                          <h4 className="text-amber-200 font-medium">{decision.decision}</h4>
                          <div className="text-xs text-amber-400">
                            {formatTimestamp(decision.timestamp)}
                          </div>
                        </div>
                        {expandedSections[`decision-${decision.id}`] ? (
                          <ChevronUp className="w-5 h-5 text-amber-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                      
                      {expandedSections[`decision-${decision.id}`] && (
                        <div className="p-3 pt-0 border-t border-amber-600/20">
                          <div className="mt-2">
                            <h5 className="text-amber-300 text-xs font-medium mb-1">Consequence:</h5>
                            <p className="text-amber-100 text-sm">{decision.consequence}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-amber-900/10 border border-amber-600/30 rounded-lg">
                  <p className="text-amber-400">No decisions found{searchTerm ? ' matching your search' : ''}.</p>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {((activeTab === 'all' && 
             filteredLocations.length === 0 && 
             filteredNPCs.length === 0 && 
             filteredDecisions.length === 0) ||
            (activeTab === 'locations' && filteredLocations.length === 0) ||
            (activeTab === 'npcs' && filteredNPCs.length === 0) ||
            (activeTab === 'decisions' && filteredDecisions.length === 0)) && (
            <div className="text-center py-8">
              <Book className="w-16 h-16 text-amber-600/30 mx-auto mb-4" />
              <h3 className="text-amber-400 text-lg mb-2">No memories found</h3>
              <p className="text-amber-300 text-sm">
                {searchTerm 
                  ? 'Try a different search term or clear your search'
                  : 'Your adventure memories will appear here as you explore the world'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-amber-600/30 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-700 hover:bg-amber-600 rounded-lg text-black font-medium transition-colors"
          >
            Close Memory Log
          </button>
        </div>
      </div>
    </div>
  );
}