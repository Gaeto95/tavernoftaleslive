import React, { useState } from 'react';
import { Compass, ChevronDown, ChevronUp, Award, Clock, CheckCircle, MapPin, ArrowRight } from 'lucide-react';
import { QuestProgress } from '../types/game';
import { MapRoom } from '../types/game';

interface QuestLogPanelProps {
  quests: QuestProgress[];
  currentLocation?: string;
  locationDescription?: string;
  currentConnections?: {
    connectedRooms: MapRoom[];
    unexploredConnections: number;
  };
  onQuestClick?: (questId: string) => void;
}

export function QuestLogPanel({ 
  quests, 
  currentLocation, 
  locationDescription,
  currentConnections,
  onQuestClick 
}: QuestLogPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedQuests, setExpandedQuests] = useState<{[key: string]: boolean}>({});
  const [showLocationDetails, setShowLocationDetails] = useState(true);

  const toggleQuest = (questId: string) => {
    setExpandedQuests(prev => ({
      ...prev,
      [questId]: !prev[questId]
    }));
  };

  const activeQuests = quests.filter(q => !q.isCompleted);
  const completedQuests = quests.filter(q => q.isCompleted);

  return (
    <div className="parchment-panel p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Compass className="w-4 h-4 text-amber-400 mr-2" />
          <h3 className="fantasy-title text-base text-amber-300">Quest Log</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-amber-400 hover:text-amber-300 transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Current Location */}
          {currentLocation && (
            <div className="mb-3">
              <div 
                className="p-2 bg-amber-900/20 border border-amber-600/30 rounded-lg cursor-pointer"
                onClick={() => setShowLocationDetails(!showLocationDetails)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 text-amber-400 mr-1 flex-shrink-0" />
                    <div className="text-amber-300 text-sm font-medium">{currentLocation}</div>
                  </div>
                  {showLocationDetails ? (
                    <ChevronUp className="w-3 h-3 text-amber-400" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-amber-400" />
                  )}
                </div>
              </div>
              
              {showLocationDetails && (
                <div className="mt-1 p-2 bg-amber-900/10 border border-amber-600/20 rounded-lg">
                  {locationDescription && (
                    <div className="text-amber-200 text-xs mb-2">{locationDescription}</div>
                  )}
                  
                  {/* Connected Rooms */}
                  {currentConnections && currentConnections.connectedRooms.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-amber-300 mb-1">Visible Paths:</div>
                      <div className="space-y-1">
                        {currentConnections.connectedRooms.map(room => (
                          <div 
                            key={room.id}
                            className="flex items-center justify-between text-xs p-1 bg-amber-900/20 rounded hover:bg-amber-900/30 cursor-pointer"
                          >
                            <span className="text-amber-200">{room.name}</span>
                            <ArrowRight className="w-3 h-3 text-amber-400" />
                          </div>
                        ))}
                        
                        {currentConnections.unexploredConnections > 0 && (
                          <div className="flex items-center justify-between text-xs p-1 bg-gray-800/50 rounded">
                            <span className="text-gray-300">Unexplored Passages</span>
                            <span className="text-gray-400">{currentConnections.unexploredConnections}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active Quests */}
          {activeQuests.length > 0 && (
            <div className="mb-3">
              <div className="text-amber-300 text-xs font-medium mb-1">Active Quests:</div>
              <div className="space-y-2">
                {activeQuests.map(quest => (
                  <div 
                    key={quest.id}
                    className="bg-amber-900/10 border border-amber-600/30 rounded-lg overflow-hidden"
                  >
                    <div 
                      className="p-2 flex justify-between items-center cursor-pointer hover:bg-amber-900/20"
                      onClick={() => {
                        toggleQuest(quest.id);
                        if (onQuestClick) onQuestClick(quest.id);
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center">
                          {quest.isMainQuest ? (
                            <Award className="w-3 h-3 text-amber-400 mr-1 flex-shrink-0" />
                          ) : (
                            <Compass className="w-3 h-3 text-amber-400 mr-1 flex-shrink-0" />
                          )}
                          <div className="text-amber-200 text-sm font-medium line-clamp-1">{quest.name}</div>
                        </div>
                        <div className="w-full h-1 bg-gray-700 rounded-full mt-1">
                          <div 
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${(quest.progress / quest.maxProgress) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      {expandedQuests[quest.id] ? (
                        <ChevronUp className="w-4 h-4 text-amber-400 ml-2 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-amber-400 ml-2 flex-shrink-0" />
                      )}
                    </div>
                    
                    {expandedQuests[quest.id] && (
                      <div className="p-2 pt-0 border-t border-amber-600/20">
                        <p className="text-amber-100 text-xs mt-2">{quest.description}</p>
                        
                        {/* Milestones */}
                        {quest.milestones && quest.milestones.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="text-xs text-amber-300 font-medium">Objectives:</div>
                            {quest.milestones.map((milestone, index) => (
                              <div key={milestone.id} className="flex items-start">
                                <div className={`w-4 h-4 flex-shrink-0 flex items-center justify-center rounded-full mr-1.5 ${
                                  milestone.isCompleted 
                                    ? 'bg-green-600/30 text-green-400' 
                                    : index === quest.currentMilestoneIndex
                                    ? 'bg-amber-600/30 text-amber-400 border border-amber-500'
                                    : 'bg-gray-800 text-gray-400'
                                }`}>
                                  {milestone.isCompleted ? (
                                    <CheckCircle className="w-2.5 h-2.5" />
                                  ) : (
                                    <span className="text-[10px]">{index + 1}</span>
                                  )}
                                </div>
                                <span className={`text-xs ${
                                  milestone.isCompleted 
                                    ? 'text-green-300 line-through' 
                                    : index === quest.currentMilestoneIndex
                                    ? 'text-amber-200 font-medium'
                                    : 'text-amber-300'
                                }`}>
                                  {milestone.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center mt-2 text-xs">
                          <div className="text-amber-300">
                            Progress: {quest.progress}/{quest.maxProgress}
                          </div>
                          {quest.isMainQuest && (
                            <div className="px-2 py-0.5 bg-amber-600/30 border border-amber-500 rounded-full text-amber-300 text-xs">
                              Main Quest
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Quests */}
          {completedQuests.length > 0 && (
            <div>
              <div className="text-amber-300 text-xs font-medium mb-1">Completed Quests:</div>
              <div className="space-y-2">
                {completedQuests.map(quest => (
                  <div 
                    key={quest.id}
                    className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-2 opacity-70"
                  >
                    <div className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-green-400 mr-1 flex-shrink-0" />
                      <div className="text-gray-300 text-sm line-clamp-1">{quest.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Quests */}
          {quests.length === 0 && (
            <div className="text-center py-4">
              <p className="text-amber-400 text-sm">No quests available yet.</p>
              <p className="text-amber-300 text-xs mt-1">Explore the world to discover quests.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}