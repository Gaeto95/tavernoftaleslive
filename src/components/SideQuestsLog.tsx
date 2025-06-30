import React, { useState } from 'react';
import { X, Award, Clock, Star, ArrowRight, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { SideQuest } from '../types/game';

interface SideQuestsLogProps {
  quests: SideQuest[];
  onClose: () => void;
  onUpdateQuest?: (questId: string, updates: Partial<SideQuest>) => void;
  onCompleteQuest?: (questId: string) => void;
}

export function SideQuestsLog({ quests, onClose, onUpdateQuest, onCompleteQuest }: SideQuestsLogProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');
  const [expandedQuests, setExpandedQuests] = useState<{[key: string]: boolean}>({});

  const toggleQuest = (questId: string) => {
    setExpandedQuests(prev => ({
      ...prev,
      [questId]: !prev[questId]
    }));
  };

  const filteredQuests = quests.filter(quest => {
    // Filter by tab
    return activeTab === 'all' ||
      (activeTab === 'active' && !quest.isCompleted) ||
      (activeTab === 'completed' && quest.isCompleted);
  });

  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-900/20 border-green-500';
      case 'medium': return 'text-amber-400 bg-amber-900/20 border-amber-500';
      case 'hard': return 'text-red-400 bg-red-900/20 border-red-500';
      default: return 'text-blue-400 bg-blue-900/20 border-blue-500';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="parchment-panel p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-amber-600/30">
          <div className="flex items-center space-x-3">
            <Award className="w-6 h-6 text-amber-400" />
            <h2 className="fantasy-title text-2xl font-bold text-amber-300">
              Side Quests
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-amber-400 hover:text-amber-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'active'
                ? 'bg-amber-600 text-black'
                : 'bg-amber-900/20 text-amber-300 hover:bg-amber-900/40'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'completed'
                ? 'bg-amber-600 text-black'
                : 'bg-amber-900/20 text-amber-300 hover:bg-amber-900/40'
            }`}
          >
            Completed
          </button>
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredQuests.length > 0 ? (
            <div className="space-y-4">
              {filteredQuests.map((quest) => (
                <div 
                  key={quest.id}
                  className={`bg-amber-900/10 border border-amber-600/30 rounded-lg overflow-hidden ${
                    quest.isCompleted ? 'opacity-70' : ''
                  }`}
                >
                  <div 
                    className="p-4 flex justify-between items-center cursor-pointer hover:bg-amber-900/20"
                    onClick={() => toggleQuest(quest.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(quest.difficulty)}`}>
                        {quest.difficulty}
                      </div>
                      <div>
                        <h4 className="text-amber-200 font-medium flex items-center">
                          {quest.title}
                          {quest.isCompleted && (
                            <CheckCircle className="w-4 h-4 text-green-400 ml-2" />
                          )}
                        </h4>
                        <div className="text-xs text-amber-400 mt-1">
                          {quest.isCompleted 
                            ? `Completed on ${formatDate(quest.completedAt || quest.createdAt)}` 
                            : `Progress: ${Math.round((quest.progress / quest.maxProgress) * 100)}%`
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {!quest.isCompleted && (
                        <div className="w-24 h-1.5 bg-gray-700 rounded-full">
                          <div 
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${(quest.progress / quest.maxProgress) * 100}%` }}
                          ></div>
                        </div>
                      )}
                      
                      {expandedQuests[quest.id] ? (
                        <ChevronUp className="w-5 h-5 text-amber-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                  </div>
                  
                  {expandedQuests[quest.id] && (
                    <div className="p-4 pt-0 border-t border-amber-600/20">
                      <div className="mt-3">
                        <p className="text-amber-100 text-sm mb-3">{quest.description}</p>
                        
                        {quest.relatedTo && (
                          <div className="flex items-center text-xs text-amber-300 mb-3">
                            <span className="mr-2">Related to:</span>
                            <span className="px-2 py-1 bg-amber-900/30 border border-amber-600/30 rounded-full">
                              {quest.relatedTo}
                            </span>
                          </div>
                        )}
                        
                        {/* Milestones */}
                        {quest.milestones && quest.milestones.length > 0 && (
                          <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-3 mb-3">
                            <h5 className="text-amber-300 text-sm font-medium mb-2">Objectives:</h5>
                            <ul className="space-y-2">
                              {quest.milestones.map((milestone, index) => (
                                <li key={milestone.id} className="flex items-start">
                                  <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full mr-2 ${
                                    milestone.isCompleted 
                                      ? 'bg-green-600/30 text-green-400' 
                                      : index === quest.currentMilestoneIndex
                                      ? 'bg-amber-600/30 text-amber-400 border border-amber-500'
                                      : 'bg-gray-800 text-gray-400'
                                  }`}>
                                    {milestone.isCompleted ? (
                                      <CheckCircle className="w-3 h-3" />
                                    ) : (
                                      <span className="text-xs">{index + 1}</span>
                                    )}
                                  </div>
                                  <span className={`text-sm ${
                                    milestone.isCompleted 
                                      ? 'text-green-300 line-through' 
                                      : index === quest.currentMilestoneIndex
                                      ? 'text-amber-200 font-medium'
                                      : 'text-amber-300'
                                  }`}>
                                    {milestone.description}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-3 mb-3">
                          <div className="flex items-center text-amber-300 text-sm mb-1">
                            <Award className="w-4 h-4 mr-2" />
                            <span>Reward:</span>
                          </div>
                          <p className="text-amber-100 text-sm">{quest.reward}</p>
                        </div>
                        
                        {!quest.isCompleted && onUpdateQuest && (
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => onUpdateQuest(quest.id, { 
                                  progress: Math.max(0, quest.progress - 1) 
                                })}
                                className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
                                disabled={quest.progress <= 0}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <div className="text-amber-300 text-sm">
                                {quest.progress} / {quest.maxProgress}
                              </div>
                              <button
                                onClick={() => onUpdateQuest(quest.id, { 
                                  progress: Math.min(quest.maxProgress, quest.progress + 1) 
                                })}
                                className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
                                disabled={quest.progress >= quest.maxProgress}
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                            </div>
                            
                            {quest.progress >= quest.maxProgress && onCompleteQuest && (
                              <button
                                onClick={() => onCompleteQuest(quest.id)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-sm transition-colors"
                              >
                                Complete Quest
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Award className="w-16 h-16 text-amber-600/30 mx-auto mb-4" />
              <h3 className="text-amber-400 text-lg mb-2">No quests found</h3>
              <p className="text-amber-300 text-sm">
                {activeTab === 'active'
                  ? 'You have no active side quests. Explore the world to discover new opportunities.'
                  : activeTab === 'completed'
                  ? 'You haven\'t completed any side quests yet.'
                  : 'No side quests available. Explore the world to discover new opportunities.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="mt-4 pt-4 border-t border-amber-600/30">
          <div className="flex justify-between items-center">
            <div className="text-amber-400 text-sm">
              {quests.filter(q => !q.isCompleted).length} active, {quests.filter(q => q.isCompleted).length} completed
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-amber-700 hover:bg-amber-600 rounded-lg text-black font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}