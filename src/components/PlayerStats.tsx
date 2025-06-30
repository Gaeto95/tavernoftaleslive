import React from 'react';
import { Sword, Shield, FlaskRound as Flask, Map, Flame, Crown, Package, Heart, Brain, Eye, MessageCircle } from 'lucide-react';
import { GameState } from '../types/game';
import { Character } from '../types/character';
import { DiceRoller } from '../utils/diceRoller';

interface PlayerStatsProps {
  gameState: GameState;
  character: Character;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const iconMap = {
  sword: Sword,
  shield: Shield,
  flask: Flask,
  map: Map,
  flame: Flame,
} as const;

const statIcons = {
  strength: Sword,
  dexterity: Eye,
  constitution: Heart,
  intelligence: Brain,
  wisdom: Eye,
  charisma: MessageCircle,
};

export function PlayerStats({ gameState, character, isCollapsed, onToggle }: PlayerStatsProps) {
  const xpPercentage = (character.experience / (character.level * 1000)) * 100;

  return (
    <div className={`parchment-panel p-3 h-full flex flex-col ${isCollapsed ? 'p-2' : ''}`}>
      {onToggle && (
        <button
          onClick={onToggle}
          className="lg:hidden w-full text-left mb-2 text-amber-300 hover:text-amber-200 transition-colors text-xs"
        >
          {isCollapsed ? 'Show Stats ▼' : 'Hide Stats ▲'}
        </button>
      )}
      
      <div className={`flex-1 flex flex-col min-h-0 ${isCollapsed ? 'hidden lg:flex' : ''}`}>
        {/* Character Info */}
        <div className="flex items-center justify-center mb-3 flex-shrink-0">
          <Crown className="w-4 h-4 text-amber-400 mr-2 flex-shrink-0" />
          <div className="text-center">
            <div className="fantasy-title text-base glow-text">{character.name}</div>
            <div className="text-xs text-amber-300">Level {character.level} {character.class.name}</div>
          </div>
        </div>

        {/* Health & AC */}
        <div className="mb-3 flex-shrink-0">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center p-1.5 bg-red-900/20 border border-red-600/30 rounded-lg">
              <div className="text-red-300 font-medium text-xs">HP</div>
              <div className="text-red-100 font-bold text-base">{character.hitPoints}/{character.maxHitPoints}</div>
            </div>
            <div className="text-center p-1.5 bg-blue-900/20 border border-blue-600/30 rounded-lg">
              <div className="text-blue-300 font-medium text-xs">AC</div>
              <div className="text-blue-100 font-bold text-base">{character.armorClass}</div>
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-3 flex-shrink-0">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-amber-300 text-xs">Experience</span>
            <span className="text-amber-300 text-xs">{character.experience} XP</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5 border border-amber-600">
            <div
              className="xp-bar h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${xpPercentage}%` }}
            />
          </div>
        </div>

        {/* Ability Scores - Compact */}
        <div className="mb-3 flex-shrink-0">
          <h3 className="fantasy-title text-xs text-amber-300 text-center mb-2">Abilities</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(character.stats).map(([statName, value]) => {
              const IconComponent = statIcons[statName as keyof typeof statIcons];
              const modifier = DiceRoller.getModifier(value);
              const isPrimary = character.class.primaryStats.includes(statName as keyof typeof character.stats);
              
              return (
                <div
                  key={statName}
                  className={`p-1.5 border rounded-lg text-center transition-colors ${
                    isPrimary 
                      ? 'border-amber-400 bg-amber-900/30' 
                      : 'border-amber-600/30 hover:border-amber-500'
                  }`}
                  title={`${statName}: ${value} (${modifier >= 0 ? '+' : ''}${modifier})`}
                >
                  <IconComponent className="w-3 h-3 text-amber-400 mx-auto mb-0.5" />
                  <div className="text-xs font-bold text-amber-100">{value}</div>
                  <div className="text-xs text-amber-400">
                    {modifier >= 0 ? '+' : ''}{modifier}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Essential Inventory - Only show key items */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-center mb-2 flex-shrink-0">
            <Package className="w-3 h-3 text-amber-300 mr-1.5 flex-shrink-0" />
            <h3 className="fantasy-title text-xs text-amber-300">Key Items</h3>
          </div>
          
          {/* Scrollable inventory container - Show only important items */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 gap-1.5">
              {character.inventory.slice(0, 4).map((item) => {
                const IconComponent = iconMap[item.icon as keyof typeof iconMap] || Sword;
                
                return (
                  <div
                    key={item.id}
                    className="inventory-item group relative bg-gray-900 border border-amber-600/50 rounded-lg p-1.5 hover:bg-gray-800 transition-all duration-200 cursor-pointer"
                    title={item.description}
                  >
                    <div className="flex items-center space-x-1.5">
                      <IconComponent className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-amber-200 font-medium line-clamp-1 leading-tight">
                          {item.name}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {character.inventory.length > 4 && (
                <div className="text-center text-xs text-amber-400 py-1.5">
                  +{character.inventory.length - 4} more items
                  <br />
                  <span className="text-amber-500 text-xs">View character sheet for all items</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Class Features - Condensed */}
        <div className="mt-3 pt-2 border-t border-amber-600 flex-shrink-0">
          <div className="text-xs text-amber-200 text-center leading-normal">
            <p className="mb-1">
              <strong className="text-amber-300 text-xs">Active Features:</strong>
            </p>
            <div className="max-h-16 overflow-y-auto custom-scrollbar">
              <p className="text-amber-400 text-xs leading-relaxed">
                {character.class.classFeatures
                  .filter(f => f.level <= character.level)
                  .slice(0, 2)
                  .map(f => f.name)
                  .join(', ')}
                {character.class.classFeatures.filter(f => f.level <= character.level).length > 2 && '...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}