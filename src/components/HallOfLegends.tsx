import React, { useState, useEffect } from 'react';
import { Trophy, Search, Star, Calendar, User, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { LegendEntry } from '../types/game';

interface HallOfLegendsProps {
  legends: LegendEntry[];
  onClose: () => void;
}

export function HallOfLegends({ legends, onClose }: HallOfLegendsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLegend, setSelectedLegend] = useState<LegendEntry | null>(null);
  const [filteredLegends, setFilteredLegends] = useState<LegendEntry[]>(legends);
  const [sortBy, setSortBy] = useState<'date' | 'level' | 'name'>('date');

  useEffect(() => {
    let sorted = [...legends];
    
    // Apply search filter
    if (searchTerm) {
      sorted = sorted.filter(legend => 
        legend.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        legend.characterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        legend.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        legend.characterClass.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => b.completedAt - a.completedAt);
        break;
      case 'level':
        sorted.sort((a, b) => b.level - a.level);
        break;
      case 'name':
        sorted.sort((a, b) => a.characterName.localeCompare(b.characterName));
        break;
    }
    
    setFilteredLegends(sorted);
  }, [legends, searchTerm, sortBy]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="parchment-panel p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-amber-600/30">
          <div className="flex items-center space-x-3">
            <Trophy className="w-8 h-8 text-amber-400" />
            <h2 className="fantasy-title text-3xl font-bold text-amber-300 glow-text">
              Hall of Legends
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-amber-400 hover:text-amber-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {selectedLegend ? (
          // Legend Detail View
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setSelectedLegend(null)}
              className="mb-4 flex items-center text-amber-400 hover:text-amber-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>Back to all legends</span>
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Legend Image */}
              <div className="bg-gray-900 border border-amber-600/30 rounded-lg overflow-hidden h-80">
                {selectedLegend.imageUrl ? (
                  <img 
                    src={selectedLegend.imageUrl} 
                    alt={selectedLegend.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-gray-900">
                    <Trophy className="w-16 h-16 text-amber-600/50" />
                  </div>
                )}
              </div>
              
              {/* Legend Details */}
              <div>
                <h3 className="fantasy-title text-2xl text-amber-300 mb-2">{selectedLegend.title}</h3>
                
                <div className="flex items-center space-x-2 mb-4">
                  <span className="px-3 py-1 bg-amber-900/30 border border-amber-600/30 rounded-full text-amber-300 text-sm">
                    Level {selectedLegend.level} {selectedLegend.characterClass}
                  </span>
                  <span className="text-amber-400 text-sm">
                    {formatDate(selectedLegend.completedAt)}
                  </span>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-amber-300 font-medium mb-2">The Legend</h4>
                  <p className="text-amber-200 leading-relaxed">{selectedLegend.summary}</p>
                </div>
                
                <div>
                  <h4 className="text-amber-300 font-medium mb-2">Achievements</h4>
                  <ul className="space-y-2">
                    {selectedLegend.achievements.map((achievement, index) => (
                      <li key={index} className="flex items-start">
                        <Star className="w-4 h-4 text-amber-400 mr-2 mt-1 flex-shrink-0" />
                        <span className="text-amber-200">{achievement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-6 pt-4 border-t border-amber-600/30">
                  <div className="flex items-center text-amber-400 text-sm">
                    <User className="w-4 h-4 mr-2" />
                    <span>Adventurer: {selectedLegend.playerName}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Legends List View
          <>
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search legends..."
                  className="w-full p-2 pl-9 spell-input rounded-lg text-amber-50 text-sm"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-400" />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setSortBy('date')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                    sortBy === 'date'
                      ? 'bg-amber-600 text-black'
                      : 'bg-amber-900/20 text-amber-300 hover:bg-amber-900/40'
                  }`}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Date
                </button>
                <button
                  onClick={() => setSortBy('level')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                    sortBy === 'level'
                      ? 'bg-amber-600 text-black'
                      : 'bg-amber-900/20 text-amber-300 hover:bg-amber-900/40'
                  }`}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Level
                </button>
                <button
                  onClick={() => setSortBy('name')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                    sortBy === 'name'
                      ? 'bg-amber-600 text-black'
                      : 'bg-amber-900/20 text-amber-300 hover:bg-amber-900/40'
                  }`}
                >
                  <User className="w-4 h-4 mr-2" />
                  Name
                </button>
              </div>
            </div>

            {/* Legends Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredLegends.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredLegends.map((legend) => (
                    <div
                      key={legend.id}
                      onClick={() => setSelectedLegend(legend)}
                      className="bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-600/30 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1"
                    >
                      {/* Legend Image */}
                      <div className="h-40 bg-gray-900 relative">
                        {legend.imageUrl ? (
                          <img 
                            src={legend.imageUrl} 
                            alt={legend.title} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-gray-900">
                            <Trophy className="w-12 h-12 text-amber-600/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                      </div>
                      
                      {/* Legend Info */}
                      <div className="p-4">
                        <h3 className="fantasy-title text-lg text-amber-300 mb-1">{legend.title}</h3>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-amber-200 text-sm">{legend.characterName}</span>
                          <span className="px-2 py-1 bg-amber-900/30 border border-amber-600/30 rounded-full text-amber-300 text-xs">
                            Lvl {legend.level} {legend.characterClass}
                          </span>
                        </div>
                        
                        <p className="text-amber-100 text-sm line-clamp-2 mb-3">{legend.summary}</p>
                        
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-amber-400">{formatDate(legend.completedAt)}</span>
                          <span className="text-amber-300">{legend.achievements.length} achievements</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-amber-600/30 mx-auto mb-4" />
                  <h3 className="text-amber-400 text-lg mb-2">No legends found</h3>
                  <p className="text-amber-300 text-sm">
                    {searchTerm 
                      ? 'Try a different search term'
                      : 'Complete adventures to earn your place in the Hall of Legends'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-amber-600/30 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-700 hover:bg-amber-600 rounded-lg text-black font-medium transition-colors"
          >
            Return to Adventure
          </button>
        </div>
      </div>
    </div>
  );
}