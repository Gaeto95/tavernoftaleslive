import React, { useState, useEffect } from 'react';
import { Skull, RotateCcw, Trophy, Clock, Sword, Heart, Star } from 'lucide-react';
import { GameStats } from '../types/game';

interface GameOverScreenProps {
  isDead: boolean;
  hasWon: boolean;
  gameStats: GameStats;
  characterName: string;
  characterLevel: number;
  onNewAdventure: () => void;
  onRevive?: () => void;
}

export function GameOverScreen({ 
  isDead, 
  hasWon, 
  gameStats, 
  characterName, 
  characterLevel,
  onNewAdventure,
  onRevive 
}: GameOverScreenProps) {
  const [legendTitle, setLegendTitle] = useState<string>('');
  
  useEffect(() => {
    // Generate a legacy title for the character
    const generateTitle = async () => {
      if (window.openaiService) {
        try {
          const title = await window.openaiService.generateLegacyTitle(
            characterName,
            `Level ${characterLevel}`,
            []
          );
          setLegendTitle(title);
        } catch (error) {
          console.error('Failed to generate legacy title:', error);
          setLegendTitle(`${characterName}, the Adventurer`);
        }
      } else {
        setLegendTitle(`${characterName}, the Adventurer`);
      }
    };
    
    if (hasWon) {
      generateTitle();
    }
  }, [hasWon, characterName, characterLevel]);

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (hasWon) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <div className="parchment-panel p-8 max-w-2xl w-full mx-4 text-center">
          <div className="mb-6">
            <Trophy className="w-24 h-24 text-amber-400 mx-auto mb-4 animate-bounce" />
            <h2 className="fantasy-title text-4xl font-bold text-amber-300 mb-2 glow-text">
              VICTORY!
            </h2>
            <p className="text-2xl text-amber-200 mb-4">
              Quest Completed
            </p>
            {legendTitle && (
              <p className="text-amber-300 text-xl mb-2 fantasy-title">
                {legendTitle}
              </p>
            )}
            <p className="text-amber-300 text-lg">
              {characterName} the Level {characterLevel} hero has triumphed!
            </p>
          </div>

          {/* Victory Stats */}
          <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-6 mb-6">
            <h3 className="fantasy-title text-xl text-amber-300 mb-4">Adventure Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <Clock className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                <div className="text-amber-100 font-bold">{formatTime(gameStats.totalPlayTime)}</div>
                <div className="text-amber-300">Time Played</div>
              </div>
              <div className="text-center">
                <Sword className="w-6 h-6 text-red-400 mx-auto mb-1" />
                <div className="text-amber-100 font-bold">{gameStats.enemiesDefeated}</div>
                <div className="text-amber-300">Foes Defeated</div>
              </div>
              <div className="text-center">
                <Star className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                <div className="text-amber-100 font-bold">{gameStats.treasuresFound}</div>
                <div className="text-amber-300">Treasures Found</div>
              </div>
              <div className="text-center">
                <Heart className="w-6 h-6 text-green-400 mx-auto mb-1" />
                <div className="text-amber-100 font-bold">{gameStats.criticalHits}</div>
                <div className="text-amber-300">Critical Hits</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-amber-200 leading-relaxed">
              Your legend will be remembered in the halls of heroes. The realm is safe thanks to your courage and determination.
            </p>
            
            <button
              onClick={onNewAdventure}
              className="rune-button px-8 py-3 rounded-lg font-bold text-black text-lg fantasy-title flex items-center justify-center space-x-2 mx-auto"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Begin New Legend</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isDead) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <div className="parchment-panel p-8 max-w-2xl w-full mx-4 text-center">
          <div className="mb-6">
            <Skull className="w-24 h-24 text-red-400 mx-auto mb-4" />
            <h2 className="fantasy-title text-4xl font-bold text-red-300 mb-2">
              DEATH CLAIMS YOU
            </h2>
            <p className="text-xl text-red-200 mb-4">
              Your adventure has come to an end
            </p>
            <p className="text-amber-300">
              {characterName} the Level {characterLevel} has fallen in battle...
            </p>
          </div>

          {/* Death Stats */}
          <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-6 mb-6">
            <h3 className="fantasy-title text-xl text-red-300 mb-4">Final Moments</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <Clock className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                <div className="text-amber-100 font-bold">{formatTime(gameStats.totalPlayTime)}</div>
                <div className="text-amber-300">Time Survived</div>
              </div>
              <div className="text-center">
                <Sword className="w-6 h-6 text-red-400 mx-auto mb-1" />
                <div className="text-amber-100 font-bold">{gameStats.totalDamageDealt}</div>
                <div className="text-amber-300">Damage Dealt</div>
              </div>
              <div className="text-center">
                <Heart className="w-6 h-6 text-red-400 mx-auto mb-1" />
                <div className="text-amber-100 font-bold">{gameStats.totalDamageTaken}</div>
                <div className="text-amber-300">Damage Taken</div>
              </div>
              <div className="text-center">
                <Star className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                <div className="text-amber-100 font-bold">{gameStats.enemiesDefeated}</div>
                <div className="text-amber-300">Last Stand</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-amber-200 leading-relaxed">
              Though your body has fallen, your spirit lives on. The tales of your bravery will inspire future heroes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {onRevive && (
                <button
                  onClick={onRevive}
                  className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-bold text-white transition-colors flex items-center justify-center space-x-2"
                >
                  <Heart className="w-5 h-5" />
                  <span>Divine Intervention</span>
                </button>
              )}
              
              <button
                onClick={onNewAdventure}
                className="rune-button px-6 py-3 rounded-lg font-bold text-black fantasy-title flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span>New Adventure</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}