import React, { useState, useEffect } from 'react';
import { Crown, Sparkles, Heart, Shield, Sword, Brain, X } from 'lucide-react';
import { CharacterClass } from '../types/character';
import { playCharacterSound } from '../utils/soundEffects';

interface LevelUpSummaryProps {
  details: {
    newLevel: number;
    statIncreases: {
      hitPoints: number;
      proficiencyBonus: number;
    };
    newAbilities: Array<{
      name: string;
      description: string;
    }>;
  };
  characterClass: CharacterClass;
  onClose: () => void;
}

export function LevelUpSummary({ details, characterClass, onClose }: LevelUpSummaryProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'abilities'>('stats');
  const [showAnimation, setShowAnimation] = useState(true);

  useEffect(() => {
    // Play level up sound when component mounts
    playCharacterSound('levelUp');
    
    // Disable animation after 3 seconds
    const timer = setTimeout(() => {
      setShowAnimation(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-2xl w-full mx-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 z-10 bg-black/80 backdrop-blur-sm border border-amber-600/50 rounded-full p-2 text-amber-300 hover:text-amber-200 transition-colors shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Level Up Card */}
        <div className="bg-gradient-to-b from-amber-900/40 to-amber-800/30 border-2 border-amber-600 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header with Animation */}
          <div className="p-6 border-b border-amber-600/50 text-center relative">
            {/* Animated elements */}
            {showAnimation && (
              <>
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-amber-300 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                <div className="absolute top-3/4 right-1/3 w-2 h-2 bg-amber-400 rounded-full animate-ping" style={{ animationDuration: '2.3s' }}></div>
                <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-amber-500 rounded-full animate-ping" style={{ animationDuration: '2.7s' }}></div>
              </>
            )}
            
            <div className="relative inline-block">
              <Crown className="w-16 h-16 text-amber-400 mx-auto mb-2" />
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-300 animate-spin" />
            </div>
            
            <h2 className={`fantasy-title text-3xl font-bold text-amber-400 mb-2 glow-text ${showAnimation ? 'animate-pulse' : ''}`}>
              LEVEL UP!
            </h2>
            
            <p className="text-2xl text-amber-300 mb-2">
              Level {details.newLevel} {characterClass.name}
            </p>
            
            <p className="text-amber-200 text-sm">
              Your power grows as you gain new abilities and strength!
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-amber-600/30">
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'bg-amber-900/30 text-amber-300 border-b-2 border-amber-500'
                  : 'text-amber-400 hover:bg-amber-900/20'
              }`}
            >
              Stat Increases
            </button>
            <button
              onClick={() => setActiveTab('abilities')}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                activeTab === 'abilities'
                  ? 'bg-amber-900/30 text-amber-300 border-b-2 border-amber-500'
                  : 'text-amber-400 hover:bg-amber-900/20'
              }`}
            >
              New Abilities
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <h3 className="fantasy-title text-xl text-amber-300 text-center mb-4">
                  Your Character Grows Stronger
                </h3>
                
                <div className="grid grid-cols-2 gap-6">
                  {/* Hit Points */}
                  <div className="p-4 bg-amber-900/20 border border-amber-600/30 rounded-lg text-center">
                    <Heart className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <div className="text-lg text-amber-300 font-medium mb-1">Hit Points</div>
                    <div className="text-2xl text-red-300 font-bold">+{details.statIncreases.hitPoints}</div>
                    <div className="text-xs text-amber-400 mt-1">
                      Based on your Constitution and class Hit Die
                    </div>
                  </div>
                  
                  {/* Proficiency Bonus */}
                  <div className="p-4 bg-amber-900/20 border border-amber-600/30 rounded-lg text-center">
                    <Sword className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <div className="text-lg text-amber-300 font-medium mb-1">Proficiency Bonus</div>
                    <div className="text-2xl text-blue-300 font-bold">+{details.statIncreases.proficiencyBonus}</div>
                    <div className="text-xs text-amber-400 mt-1">
                      Improves all your proficient skills and attacks
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-amber-900/10 border border-amber-600/20 rounded-lg">
                  <h4 className="text-amber-300 font-medium mb-2">Class Benefits</h4>
                  <p className="text-amber-200 text-sm">
                    As a {characterClass.name}, you gain additional benefits at level {details.newLevel}. 
                    Your primary abilities ({characterClass.primaryStats.join(', ')}) become even more effective.
                  </p>
                </div>
              </div>
            )}
            
            {activeTab === 'abilities' && (
              <div className="space-y-4">
                <h3 className="fantasy-title text-xl text-amber-300 text-center mb-4">
                  New Class Features
                </h3>
                
                {details.newAbilities.length > 0 ? (
                  <div className="space-y-4">
                    {details.newAbilities.map((ability, index) => (
                      <div key={index} className="p-4 bg-amber-900/20 border border-amber-600/30 rounded-lg">
                        <div className="flex items-start">
                          <Sparkles className="w-5 h-5 text-amber-400 mt-1 mr-2 flex-shrink-0" />
                          <div>
                            <h4 className="text-amber-300 font-bold text-lg">{ability.name}</h4>
                            <p className="text-amber-200 text-sm mt-1">{ability.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 text-amber-600/50 mx-auto mb-3" />
                    <p className="text-amber-400">No new class features at this level</p>
                    <p className="text-amber-300 text-sm mt-2">
                      Your existing abilities continue to grow in power as you level up.
                    </p>
                  </div>
                )}
                
                <div className="mt-4 p-4 bg-amber-900/10 border border-amber-600/20 rounded-lg">
                  <h4 className="text-amber-300 font-medium mb-2">Character Development</h4>
                  <p className="text-amber-200 text-sm">
                    As you continue your adventure, your character will develop new skills and abilities.
                    Each level brings you closer to mastering your class's full potential.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-amber-600/30 text-center">
            <button
              onClick={onClose}
              className="rune-button px-8 py-3 rounded-lg font-bold text-black text-lg"
            >
              Continue Adventure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}