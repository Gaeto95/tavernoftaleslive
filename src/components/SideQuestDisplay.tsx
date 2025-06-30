import React, { useState, useEffect } from 'react';
import { X, Award, Clock, Star, ArrowRight, CheckCircle } from 'lucide-react';
import { SideQuest } from '../types/game';
import { playQuestSound } from '../utils/soundEffects';

interface SideQuestDisplayProps {
  quest: SideQuest;
  onClose: () => void;
  onAccept?: () => void;
}

export function SideQuestDisplay({ quest, onClose, onAccept }: SideQuestDisplayProps) {
  const [isAccepted, setIsAccepted] = useState(quest.progress > 0);
  
  // Play discovery sound when component mounts
  useEffect(() => {
    playQuestSound('discover');
  }, []);

  const getDifficultyColor = () => {
    switch (quest.difficulty) {
      case 'easy': return 'from-green-900 to-green-700 border-green-500';
      case 'medium': return 'from-amber-900 to-amber-700 border-amber-500';
      case 'hard': return 'from-red-900 to-red-700 border-red-500';
      default: return 'from-blue-900 to-blue-700 border-blue-500';
    }
  };

  const getDifficultyStars = () => {
    switch (quest.difficulty) {
      case 'easy': return 1;
      case 'medium': return 2;
      case 'hard': return 3;
      default: return 1;
    }
  };

  const handleAccept = () => {
    setIsAccepted(true);
    // Play accept sound
    playQuestSound('accept');
    if (onAccept) onAccept();
  };

  const progressPercentage = Math.round((quest.progress / quest.maxProgress) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-md w-full mx-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 z-10 bg-black/80 backdrop-blur-sm border border-amber-600/50 rounded-full p-2 text-amber-300 hover:text-amber-200 transition-colors shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Quest Card */}
        <div className={`bg-gradient-to-b ${getDifficultyColor()} border-2 rounded-2xl overflow-hidden shadow-2xl`}>
          {/* Quest Header */}
          <div className="p-4 border-b border-white/20">
            <div className="flex justify-between items-center mb-2">
              <h3 className="fantasy-title text-xl font-bold text-white">{quest.title}</h3>
              <div className="flex">
                {[...Array(getDifficultyStars())].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                ))}
              </div>
            </div>
            <div className="flex items-center text-sm text-white/80">
              <Clock className="w-4 h-4 mr-1" />
              <span>New side quest</span>
            </div>
          </div>

          {/* Quest Content */}
          <div className="p-6">
            <p className="text-white/90 text-sm mb-6">{quest.description}</p>
            
            {/* Related To */}
            {quest.relatedTo && (
              <div className="mb-4 bg-black/30 p-3 rounded-lg">
                <h4 className="text-white/90 text-xs font-bold mb-1">Related to:</h4>
                <p className="text-white/80 text-sm">{quest.relatedTo}</p>
              </div>
            )}
            
            {/* Milestones */}
            {quest.milestones && quest.milestones.length > 0 && (
              <div className="mb-4 bg-black/30 p-3 rounded-lg">
                <h4 className="text-white/90 text-xs font-bold mb-2">Objectives:</h4>
                <ul className="space-y-2">
                  {quest.milestones.map((milestone, index) => (
                    <li key={index} className="flex items-start text-sm text-white/80">
                      <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center bg-black/30 rounded-full mr-2 text-xs">
                        {index + 1}
                      </span>
                      <span>{milestone.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reward */}
            <div className="mb-6 bg-black/30 p-3 rounded-lg">
              <h4 className="text-white/90 text-xs font-bold mb-1 flex items-center">
                <Award className="w-3 h-3 mr-1" />
                Reward:
              </h4>
              <p className="text-white/80 text-sm">{quest.reward}</p>
            </div>

            {/* Progress Bar */}
            {isAccepted && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-white/80 mb-1">
                  <span>Progress</span>
                  <span>{progressPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white/70 rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Accept Button */}
            {!isAccepted ? (
              <button
                onClick={handleAccept}
                className="w-full py-3 bg-white/20 hover:bg-white/30 border border-white/40 rounded-lg text-white font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <span>Accept Quest</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center justify-center text-white/80 text-sm">
                <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                <span>Quest accepted</span>
              </div>
            )}
          </div>

          {/* Quest Footer */}
          <div className="bg-black/40 p-4 text-center">
            <p className="text-white/70 text-xs">
              Complete this quest to earn rewards and advance your story
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}