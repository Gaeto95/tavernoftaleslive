import React, { useState, useEffect } from 'react';
import { Character, InventoryItem, EquipmentSlots } from '../types/character';
import { DiceRoller } from '../utils/diceRoller';
import { User, Sword, Shield, Heart, Brain, Eye, MessageCircle, Crown, Star, Package, X, Zap, Plus, Minus } from 'lucide-react';
import { ModelViewer } from './ModelViewer';

interface CharacterSheetProps {
  character: Character;
  onClose: () => void;
  onEquipItem?: (item: InventoryItem, slot: keyof EquipmentSlots) => void;
  onUnequipItem?: (slot: keyof EquipmentSlots) => void;
  onUseItem?: (itemId: string) => void;
}

export function CharacterSheet({ character, onClose, onEquipItem, onUnequipItem, onUseItem }: CharacterSheetProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'equipment' | 'spells' | 'features' | 'appearance'>('stats');
  
  const getStatModifier = (score: number) => DiceRoller.getModifier(score);

  const statIcons = {
    strength: Sword,
    dexterity: Eye,
    constitution: Heart,
    intelligence: Brain,
    wisdom: Eye,
    charisma: MessageCircle,
  };

  const equipmentSlotNames: { [K in keyof EquipmentSlots]: string } = {
    mainHand: 'Main Hand',
    offHand: 'Off Hand',
    armor: 'Armor',
    helmet: 'Helmet',
    boots: 'Boots',
    gloves: 'Gloves',
    ring1: 'Ring 1',
    ring2: 'Ring 2',
    necklace: 'Necklace',
    cloak: 'Cloak',
  };

  const handleEquipItem = (item: InventoryItem) => {
    if (!item.isEquippable || !item.equipmentSlot || !onEquipItem) return;
    onEquipItem(item, item.equipmentSlot);
  };

  const handleUnequipItem = (slot: keyof EquipmentSlots) => {
    if (!onUnequipItem) return;
    onUnequipItem(slot);
  };

  const handleUseItem = (itemId: string) => {
    if (!onUseItem) return;
    onUseItem(itemId);
  };

  const getSkillModifier = (skillName: string) => {
    if (character.skillsData && character.skillsData[skillName]) {
      return character.skillsData[skillName].modifier;
    }
    return character.skills && character.skills[skillName as keyof typeof character.skills] || 0;
  };

  const isSkillProficient = (skillName: string) => {
    return character.skillsData?.[skillName]?.isProficient || false;
  };

  const getSavingThrowModifier = (ability: string) => {
    if (character.savingThrowsData && character.savingThrowsData[ability]) {
      return character.savingThrowsData[ability].modifier;
    }
    return character.savingThrows && character.savingThrows[ability as keyof typeof character.savingThrows] || 0;
  };

  const isSavingThrowProficient = (ability: string) => {
    return character.savingThrowsData?.[ability]?.isProficient || false;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen p-4">
        <div className="max-w-7xl mx-auto bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-2 border-amber-600/50 rounded-2xl overflow-hidden shadow-2xl">
          
          {/* Header */}
          <div className="relative bg-gradient-to-r from-amber-900/40 to-amber-800/40 border-b border-amber-600/50 p-8">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-10 bg-black/80 backdrop-blur-sm border border-amber-600/50 rounded-lg p-2 text-amber-300 hover:text-amber-200 transition-colors shadow-lg"
            >
              <X className="w-8 h-8" />
            </button>
            
            <div className="text-center pr-16">
              <h2 className="fantasy-title text-5xl font-bold text-amber-300 mb-3 glow-text">
                {character.name}
              </h2>
              <p className="text-amber-200 text-2xl">
                Level {character.level} {character.class.name}
              </p>
              <p className="text-amber-300 text-lg mt-2">
                {character.background} Background
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-gray-800/50 border-b border-amber-600/30 p-4">
            <div className="flex justify-center space-x-4">
              {[
                { id: 'stats', label: 'Stats & Skills', icon: Star },
                { id: 'equipment', label: 'Equipment', icon: Package },
                { id: 'spells', label: 'Spells', icon: Zap },
                { id: 'features', label: 'Features', icon: Crown },
                { id: 'appearance', label: 'Appearance', icon: User },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === id
                      ? 'bg-amber-600 text-black'
                      : 'bg-gray-700 text-amber-300 hover:bg-gray-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            {/* Stats & Skills Tab */}
            {activeTab === 'stats' && (
              <div className="space-y-10">
                {/* Ability Scores */}
                <section>
                  <h3 className="fantasy-title text-amber-300 mb-8 flex items-center justify-center text-3xl">
                    <Star className="w-8 h-8 mr-4" />
                    Ability Scores
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    {Object.entries(character.stats).map(([statName, value]) => {
                      const IconComponent = statIcons[statName as keyof typeof statIcons];
                      const modifier = getStatModifier(value);
                      const isPrimary = character.class.primaryStats.includes(statName as keyof typeof character.stats);
                      
                      return (
                        <div
                          key={statName}
                          className={`relative p-6 border-2 rounded-2xl text-center transition-all duration-300 hover:scale-105 ${
                            isPrimary 
                              ? 'border-amber-400 bg-gradient-to-b from-amber-900/60 to-amber-800/40 shadow-lg shadow-amber-400/30' 
                              : 'border-amber-600/50 bg-gradient-to-b from-gray-800/60 to-gray-700/40 hover:border-amber-500'
                          }`}
                        >
                          {isPrimary && (
                            <div className="absolute -top-2 -right-2 bg-amber-400 text-black text-xs font-bold px-2 py-1 rounded-full">
                              PRIMARY
                            </div>
                          )}
                          
                          <div className="flex items-center justify-center mb-4">
                            <IconComponent className="w-7 h-7 text-amber-400 mr-2" />
                            <span className="text-lg text-amber-300 capitalize font-bold">
                              {statName}
                            </span>
                          </div>
                          
                          <div className="text-4xl font-bold text-amber-100 mb-3">{value}</div>
                          
                          <div className="text-xl text-amber-400 font-bold">
                            {modifier >= 0 ? '+' : ''}{modifier}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Saving Throws */}
                <section>
                  <h3 className="fantasy-title text-amber-300 mb-6 text-2xl">Saving Throws</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(character.stats).map(([ability, score]) => {
                      const modifier = getSavingThrowModifier(ability);
                      const isProficient = isSavingThrowProficient(ability);
                      
                      return (
                        <div
                          key={ability}
                          className={`p-4 rounded-lg border ${
                            isProficient 
                              ? 'border-green-500 bg-green-900/20' 
                              : 'border-gray-600 bg-gray-800/50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-amber-300 capitalize font-medium">{ability}</span>
                            <div className="flex items-center space-x-2">
                              {isProficient && (
                                <div className="w-2 h-2 bg-green-400 rounded-full" title="Proficient" />
                              )}
                              <span className="text-amber-100 font-bold">
                                {modifier >= 0 ? '+' : ''}{modifier}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Skills */}
                <section>
                  <h3 className="fantasy-title text-amber-300 mb-6 text-2xl">Skills</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {character.skills && Object.keys(character.skills).map((skillName) => {
                      const modifier = getSkillModifier(skillName);
                      const isProficient = isSkillProficient(skillName);
                      
                      return (
                        <div
                          key={skillName}
                          className={`p-3 rounded-lg border ${
                            isProficient 
                              ? 'border-blue-500 bg-blue-900/20' 
                              : 'border-gray-600 bg-gray-800/50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-amber-300 capitalize font-medium">
                              {skillName.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <div className="flex items-center space-x-2">
                              {isProficient && (
                                <div className="w-2 h-2 bg-blue-400 rounded-full" title="Proficient" />
                              )}
                              <span className="text-amber-100 font-bold">
                                {modifier >= 0 ? '+' : ''}{modifier}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* Equipment Tab */}
            {activeTab === 'equipment' && (
              <div className="space-y-8">
                {/* Equipment Slots */}
                <section>
                  <h3 className="fantasy-title text-amber-300 mb-6 text-2xl">Equipped Items</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {character.equipmentSlots && Object.entries(equipmentSlotNames).map(([slot, name]) => {
                      const equippedItem = character.equipmentSlots?.[slot as keyof EquipmentSlots];
                      
                      return (
                        <div
                          key={slot}
                          className="p-4 border-2 border-dashed border-amber-600/30 rounded-lg text-center min-h-[120px] flex flex-col justify-center"
                        >
                          <div className="text-amber-300 text-sm font-medium mb-2">{name}</div>
                          {equippedItem ? (
                            <div className="space-y-2">
                              <div className="text-amber-100 font-bold text-sm">{equippedItem.name}</div>
                              <button
                                onClick={() => handleUnequipItem(slot as keyof EquipmentSlots)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs transition-colors"
                              >
                                Unequip
                              </button>
                            </div>
                          ) : (
                            <div className="text-gray-500 text-xs">Empty</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Inventory */}
                <section>
                  <h3 className="fantasy-title text-amber-300 mb-6 text-2xl">
                    Inventory ({character.inventory.length} items)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {character.inventory.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 bg-gray-800/50 border border-gray-600/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-amber-200 font-bold text-lg">{item.name}</h4>
                          <span className={`text-xs uppercase px-2 py-1 rounded-full ${
                            item.rarity === 'common' ? 'bg-gray-600 text-gray-200' :
                            item.rarity === 'uncommon' ? 'bg-green-600 text-green-200' :
                            item.rarity === 'rare' ? 'bg-blue-600 text-blue-200' :
                            item.rarity === 'very_rare' ? 'bg-purple-600 text-purple-200' :
                            item.rarity === 'legendary' ? 'bg-orange-600 text-orange-200' :
                            'bg-red-600 text-red-200'
                          }`}>
                            {item.rarity}
                          </span>
                        </div>
                        <p className="text-amber-300 text-sm mb-3 leading-relaxed">{item.description}</p>
                        
                        <div className="flex space-x-2">
                          {item.isEquippable && !item.isEquipped && (
                            <button
                              onClick={() => handleEquipItem(item)}
                              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-medium transition-colors"
                            >
                              Equip
                            </button>
                          )}
                          {item.type === 'potion' && (
                            <button
                              onClick={() => handleUseItem(item.id)}
                              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm font-medium transition-colors"
                            >
                              Use
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Spells Tab */}
            {activeTab === 'spells' && (
              <div className="space-y-8">
                {character.class.spellcaster ? (
                  <>
                    {/* Spell Slots */}
                    {character.spellSlots && Object.keys(character.spellSlots).length > 0 && (
                      <section>
                        <h3 className="fantasy-title text-amber-300 mb-6 text-2xl">Spell Slots</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(character.spellSlots).map(([level, slots]) => (
                            <div
                              key={level}
                              className="p-4 bg-purple-900/20 border border-purple-600/30 rounded-lg text-center"
                            >
                              <div className="text-purple-300 font-bold mb-2">
                                {level.replace('level', 'Level ')}
                              </div>
                              <div className="text-purple-100 text-2xl font-bold">
                                {slots.current}/{slots.max}
                              </div>
                              <div className="flex justify-center space-x-2 mt-2">
                                <button
                                  disabled={slots.current <= 0}
                                  className="p-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <button
                                  disabled={slots.current >= slots.max}
                                  className="p-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Known Spells */}
                    <section>
                      <h3 className="fantasy-title text-amber-300 mb-6 text-2xl">Known Spells</h3>
                      <div className="space-y-4">
                        {character.spells && character.spells.length > 0 ? (
                          character.spells.map((spell, index) => (
                            <div key={index} className="p-4 bg-purple-900/20 border border-purple-600/30 rounded-lg">
                              <p className="text-purple-200 font-bold text-lg">{spell}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-amber-400">
                            No spells learned yet. Spells will be available as you level up.
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Zap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="fantasy-title text-xl text-gray-400 mb-2">Non-Spellcaster</h3>
                    <p className="text-gray-500">
                      {character.class.name}s do not use magic spells. Your power comes from martial prowess and other abilities.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Features Tab */}
            {activeTab === 'features' && (
              <div className="space-y-8">
                <section>
                  <h3 className="fantasy-title text-amber-300 mb-6 text-2xl">Class Features</h3>
                  <div className="space-y-4">
                    {character.class.classFeatures
                      .filter(feature => feature.level <= character.level)
                      .map((feature, index) => (
                        <div key={index} className="p-6 bg-amber-900/20 border border-amber-600/30 rounded-xl">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="text-amber-200 font-bold text-xl">{feature.name}</h4>
                            <span className="text-amber-400 text-sm bg-amber-900/50 px-3 py-1 rounded-full">
                              Level {feature.level}
                            </span>
                          </div>
                          <p className="text-amber-300 text-base leading-relaxed">{feature.description}</p>
                        </div>
                      ))}
                  </div>
                </section>

                {/* Conditions */}
                {character.conditions && character.conditions.length > 0 && (
                  <section>
                    <h3 className="fantasy-title text-amber-300 mb-6 text-2xl">Active Conditions</h3>
                    <div className="space-y-4">
                      {character.conditions.map((condition, index) => (
                        <div key={index} className="p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-red-200 font-bold text-lg">{condition.name}</h4>
                            <span className="text-red-400 text-sm">
                              {condition.duration === -1 ? 'Permanent' : `${condition.duration} rounds`}
                            </span>
                          </div>
                          <p className="text-red-300 text-sm">{condition.description}</p>
                          <p className="text-red-400 text-xs mt-1">Source: {condition.source}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-8">
                <section>
                  <h3 className="fantasy-title text-amber-300 mb-6 text-2xl">Character Appearance</h3>
                  <div className="flex justify-center">
                    <div className="w-64 h-64">
                      <ModelViewer modelIndex={character.appearance?.modelIndex || 0} />
                    </div>
                  </div>
                  <div className="text-center mt-4">
                    <p className="text-amber-200">
                      This is how your character appears to others in the game world.
                    </p>
                    <p className="text-amber-400 text-sm mt-2">
                      To change your appearance, create a new character or visit the character customization shop in-game.
                    </p>
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-amber-900/40 to-amber-800/40 border-t border-amber-600/50 p-8 text-center">
            <button
              onClick={onClose}
              className="rune-button px-16 py-5 rounded-2xl font-bold text-black text-2xl fantasy-title hover:scale-105 transition-transform"
            >
              Close Character Sheet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}