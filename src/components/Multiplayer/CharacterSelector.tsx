import React, { useState, useEffect } from 'react';
import { User, Plus, ArrowLeft, Crown, Sword, Shield, Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Character } from '../../types/character';
import { DiceRoller } from '../../utils/diceRoller';

interface CharacterSelectorProps {
  currentUserId: string;
  onCharacterSelected: (character: Character) => void;
  onCreateNew: () => void;
  onCancel: () => void;
  inSession?: boolean;
}

export function CharacterSelector({ 
  currentUserId, 
  onCharacterSelected, 
  onCreateNew, 
  onCancel,
  inSession = false 
}: CharacterSelectorProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCharacters();
  }, [currentUserId]);

  const loadCharacters = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading characters for user:', currentUserId);
      
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', currentUserId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Process characters from Supabase format to app format
      const processedCharacters = data.map(char => {
        // Parse JSON fields if they're stored as strings
        const stats = typeof char.stats === 'string' ? JSON.parse(char.stats) : char.stats;
        const inventory = typeof char.inventory === 'string' ? JSON.parse(char.inventory) : char.inventory;
        const spells = typeof char.spells === 'string' ? JSON.parse(char.spells) : char.spells;
        const skillsData = typeof char.skills_data === 'string' ? JSON.parse(char.skills_data) : char.skills_data;
        const savingThrowsData = typeof char.saving_throws_data === 'string' ? JSON.parse(char.saving_throws_data) : char.saving_throws_data;
        const equipmentSlots = typeof char.equipment_slots === 'string' ? JSON.parse(char.equipment_slots) : char.equipment_slots;
        const spellSlots = typeof char.spell_slots === 'string' ? JSON.parse(char.spell_slots) : char.spell_slots;
        
        // Get class details
        const classDetails = getClassDetails(char.class_id);
        
        return {
          id: char.id,
          userId: char.user_id,
          name: char.name,
          class: {
            id: char.class_id,
            ...classDetails
          },
          level: char.level,
          stats: stats,
          hitPoints: char.hit_points,
          maxHitPoints: char.max_hit_points,
          armorClass: char.armor_class,
          proficiencyBonus: char.proficiency_bonus,
          experience: char.experience,
          background: char.background,
          inventory: inventory || [],
          spells: spells || [],
          skills: generateDefaultSkills(stats, classDetails, char.proficiency_bonus),
          savingThrows: generateDefaultSavingThrows(stats, classDetails, char.proficiency_bonus),
          conditions: [],
          luck: 3,
          inspiration: false,
          deathSaves: { successes: 0, failures: 0 },
          temporaryHitPoints: 0,
          skillsData: skillsData || {},
          savingThrowsData: savingThrowsData || {},
          equipmentSlots: equipmentSlots || {},
          spellSlots: spellSlots || {},
          createdAt: new Date(char.created_at).getTime(),
          updatedAt: new Date(char.updated_at).getTime(),
          active_session_id: char.active_session_id
        };
      });
      
      console.log('Characters loaded:', processedCharacters.length, processedCharacters);
      setCharacters(processedCharacters);
    } catch (err) {
      console.error('Error loading characters:', err);
      setError(err instanceof Error ? err.message : 'Failed to load characters');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get class details
  const getClassDetails = (classId: string) => {
    // This would ideally come from your CHARACTER_CLASSES data
    // For now, returning a minimal structure to avoid errors
    return {
      name: classId.charAt(0).toUpperCase() + classId.slice(1),
      description: 'A character class',
      hitDie: 8,
      primaryStats: ['strength', 'dexterity'],
      savingThrows: ['strength', 'constitution'],
      skillProficiencies: ['Athletics', 'Perception'],
      startingEquipment: ['Sword', 'Shield'],
      classFeatures: [
        { name: 'Feature 1', description: 'Description 1', level: 1 }
      ],
      spellcaster: false
    };
  };

  // Helper functions to generate default skills and saving throws
  const generateDefaultSkills = (stats: any, characterClass: any, proficiencyBonus: number) => {
    const getModifier = (score: number) => Math.floor((score - 10) / 2);
    
    return {
      acrobatics: getModifier(stats.dexterity),
      animalHandling: getModifier(stats.wisdom),
      arcana: getModifier(stats.intelligence),
      athletics: getModifier(stats.strength),
      deception: getModifier(stats.charisma),
      history: getModifier(stats.intelligence),
      insight: getModifier(stats.wisdom),
      intimidation: getModifier(stats.charisma),
      investigation: getModifier(stats.intelligence),
      medicine: getModifier(stats.wisdom),
      nature: getModifier(stats.intelligence),
      perception: getModifier(stats.wisdom),
      performance: getModifier(stats.charisma),
      persuasion: getModifier(stats.charisma),
      religion: getModifier(stats.intelligence),
      sleightOfHand: getModifier(stats.dexterity),
      stealth: getModifier(stats.dexterity),
      survival: getModifier(stats.wisdom),
    };
  };

  const generateDefaultSavingThrows = (stats: any, characterClass: any, proficiencyBonus: number) => {
    const getModifier = (score: number) => Math.floor((score - 10) / 2);
    const isProficient = (stat: string) => characterClass.savingThrows?.includes(stat);
    
    return {
      strength: getModifier(stats.strength) + (isProficient('strength') ? proficiencyBonus : 0),
      dexterity: getModifier(stats.dexterity) + (isProficient('dexterity') ? proficiencyBonus : 0),
      constitution: getModifier(stats.constitution) + (isProficient('constitution') ? proficiencyBonus : 0),
      intelligence: getModifier(stats.intelligence) + (isProficient('intelligence') ? proficiencyBonus : 0),
      wisdom: getModifier(stats.wisdom) + (isProficient('wisdom') ? proficiencyBonus : 0),
      charisma: getModifier(stats.charisma) + (isProficient('charisma') ? proficiencyBonus : 0),
    };
  };

  const getStatModifier = (score: number) => DiceRoller.getModifier(score);

  const getCharacterStatusColor = (character: Character) => {
    if (character.active_session_id && !inSession) {
      return 'border-yellow-500 bg-yellow-900/20';
    }
    if (character.hitPoints === 0) {
      return 'border-red-500 bg-red-900/20';
    }
    return 'border-amber-600/50 hover:border-amber-500';
  };

  const getCharacterStatusText = (character: Character) => {
    if (character.active_session_id && !inSession) {
      return 'In Session';
    }
    if (character.hitPoints === 0) {
      return 'Unconscious';
    }
    return 'Available';
  };

  const canSelectCharacter = (character: Character) => {
    // Can't select characters that are in other sessions (unless we're switching in current session)
    if (character.active_session_id && !inSession) {
      return false;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="parchment-panel p-8 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onCancel}
            className="flex items-center space-x-2 text-amber-400 hover:text-amber-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <User className="w-6 h-6 text-amber-400" />
            <h2 className="fantasy-title text-2xl font-bold text-amber-300">
              {inSession ? 'Switch Character' : 'Select Character'}
            </h2>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-6">
            <p className="text-red-200">Error: {error}</p>
            <button
              onClick={loadCharacters}
              className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-amber-300">Loading your characters...</p>
          </div>
        ) : characters.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <h3 className="fantasy-title text-xl text-amber-300 mb-2">No Characters Found</h3>
            <p className="text-amber-200 mb-6">
              You haven't created any characters yet. Create your first character to begin your adventure!
            </p>
            <button
              onClick={onCreateNew}
              className="rune-button px-6 py-3 rounded-lg font-bold text-black"
            >
              Create Your First Character
            </button>
          </div>
        ) : (
          <>
            {/* Character Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {characters.map((character) => {
                const canSelect = canSelectCharacter(character);
                const statusColor = getCharacterStatusColor(character);
                const statusText = getCharacterStatusText(character);
                
                return (
                  <div
                    key={character.id}
                    className={`p-6 border-2 rounded-lg transition-all duration-300 cursor-pointer ${
                      canSelect 
                        ? `${statusColor} hover:scale-105 hover:shadow-lg hover:shadow-amber-400/20`
                        : 'border-gray-600 bg-gray-800/50 opacity-60 cursor-not-allowed'
                    }`}
                    onClick={() => canSelect && onCharacterSelected(character)}
                  >
                    {/* Character Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="fantasy-title text-xl font-bold text-amber-300 mb-1">
                          {character.name}
                        </h3>
                        <p className="text-amber-200 text-sm">
                          Level {character.level} {character.class.name}
                        </p>
                        <p className="text-amber-400 text-xs">
                          {character.background} Background
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          statusText === 'Available' ? 'bg-green-600 text-green-100' :
                          statusText === 'In Session' ? 'bg-yellow-600 text-yellow-100' :
                          'bg-red-600 text-red-100'
                        }`}>
                          {statusText}
                        </div>
                      </div>
                    </div>

                    {/* Character Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-2 bg-red-900/20 border border-red-600/30 rounded">
                        <Heart className="w-4 h-4 text-red-400 mx-auto mb-1" />
                        <div className="text-red-100 text-sm font-bold">
                          {character.hitPoints}/{character.maxHitPoints}
                        </div>
                        <div className="text-red-300 text-xs">HP</div>
                      </div>
                      <div className="text-center p-2 bg-blue-900/20 border border-blue-600/30 rounded">
                        <Shield className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                        <div className="text-blue-100 text-sm font-bold">{character.armorClass}</div>
                        <div className="text-blue-300 text-xs">AC</div>
                      </div>
                      <div className="text-center p-2 bg-amber-900/20 border border-amber-600/30 rounded">
                        <Crown className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                        <div className="text-amber-100 text-sm font-bold">{character.experience}</div>
                        <div className="text-amber-300 text-xs">XP</div>
                      </div>
                    </div>

                    {/* Primary Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {character.class.primaryStats.slice(0, 3).map((statName) => {
                        const statValue = character.stats[statName];
                        const modifier = getStatModifier(statValue);
                        
                        return (
                          <div key={statName} className="text-center">
                            <div className="text-amber-300 text-xs capitalize">{statName.slice(0, 3)}</div>
                            <div className="text-amber-100 text-sm font-bold">
                              {modifier >= 0 ? '+' : ''}{modifier}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Equipment Preview */}
                    <div className="text-xs text-amber-400">
                      <div className="flex items-center space-x-1 mb-1">
                        <Sword className="w-3 h-3" />
                        <span>{character.inventory.slice(0, 2).map(item => item.name).join(', ')}</span>
                      </div>
                      {character.inventory.length > 2 && (
                        <div className="text-amber-500">
                          +{character.inventory.length - 2} more items
                        </div>
                      )}
                    </div>

                    {/* Selection Indicator */}
                    {canSelect && (
                      <div className="mt-4 text-center">
                        <div className="text-amber-300 text-sm font-medium">
                          Click to {inSession ? 'switch to' : 'select'} this character
                        </div>
                      </div>
                    )}

                    {!canSelect && (
                      <div className="mt-4 text-center">
                        <div className="text-gray-400 text-sm">
                          Character unavailable
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Create New Character Card */}
              <div
                onClick={onCreateNew}
                className="p-6 border-2 border-dashed border-amber-600/50 rounded-lg transition-all duration-300 cursor-pointer hover:border-amber-500 hover:bg-amber-900/10 hover:scale-105 flex flex-col items-center justify-center min-h-[300px]"
              >
                <Plus className="w-12 h-12 text-amber-400 mb-4" />
                <h3 className="fantasy-title text-lg font-bold text-amber-300 mb-2">
                  Create New Character
                </h3>
                <p className="text-amber-200 text-sm text-center">
                  Start a new adventure with a fresh character
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center">
              <p className="text-amber-400 text-sm">
                {inSession 
                  ? 'Switching characters will update your participation in the current session'
                  : 'Select a character to continue to the session browser'
                }
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}