import { useState, useEffect, useCallback } from 'react';
import { Character, InventoryItem, EquipmentSlots, CharacterSkillsData, SavingThrowsData } from '../types/character';
import { DiceRoller } from '../utils/diceRoller';
import { supabase } from '../lib/supabase';

const CHARACTER_STORAGE_KEY = 'ai-dungeon-master-character';

// Enhanced logging utility
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[CHARACTER INFO] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[CHARACTER ERROR] ${message}`, error || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[CHARACTER WARN] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    console.log(`[CHARACTER DEBUG] ${message}`, data || '');
  }
};

export function useCharacter() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseCharacterId, setSupabaseCharacterId] = useState<string | null>(null);

  // Load character from localStorage on mount
  useEffect(() => {
    const loadCharacter = async () => {
      const savedCharacter = localStorage.getItem(CHARACTER_STORAGE_KEY);
      if (savedCharacter) {
        try {
          const parsedCharacter = JSON.parse(savedCharacter);
          // Ensure new properties exist
          const updatedCharacter = {
            ...parsedCharacter,
            temporaryHitPoints: parsedCharacter.temporaryHitPoints || 0,
            skills: parsedCharacter.skills || generateDefaultSkills(parsedCharacter.stats, parsedCharacter.class, parsedCharacter.proficiencyBonus),
            savingThrows: parsedCharacter.savingThrows || generateDefaultSavingThrows(parsedCharacter.stats, parsedCharacter.class, parsedCharacter.proficiencyBonus),
            conditions: parsedCharacter.conditions || [],
            luck: parsedCharacter.luck || 3,
            inspiration: parsedCharacter.inspiration || false,
            deathSaves: parsedCharacter.deathSaves || { successes: 0, failures: 0 },
            skillsData: parsedCharacter.skillsData || generateSkillsData(parsedCharacter.stats, parsedCharacter.class, parsedCharacter.proficiencyBonus),
            savingThrowsData: parsedCharacter.savingThrowsData || generateSavingThrowsData(parsedCharacter.stats, parsedCharacter.class, parsedCharacter.proficiencyBonus),
            equipmentSlots: parsedCharacter.equipmentSlots || {},
            spellSlots: parsedCharacter.spellSlots || generateSpellSlots(parsedCharacter.class, parsedCharacter.level)
          };
          setCharacter(updatedCharacter);
          
          // Check if character exists in Supabase
          if (parsedCharacter.id) {
            await syncCharacterToSupabase(updatedCharacter);
          }
        } catch (error) {
          logger.error('Failed to load character:', error);
          localStorage.removeItem(CHARACTER_STORAGE_KEY);
        }
      }
      setIsLoading(false);
    };
    
    loadCharacter();
  }, []);

  // Sync character to Supabase
  const syncCharacterToSupabase = async (characterData: Character) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        logger.warn('No authenticated user, skipping Supabase sync');
        return;
      }
      
      const userId = user.data.user.id;
      logger.info(`Syncing character to Supabase: ${characterData.name}`);
      
      // Check if character already exists in Supabase
      let existingCharacterId = supabaseCharacterId;
      
      if (!existingCharacterId) {
        // Try to find by name and user_id
        const { data: existingCharacters, error: findError } = await supabase
          .from('characters')
          .select('id')
          .eq('user_id', userId)
          .eq('name', characterData.name)
          .limit(1); // Add LIMIT 1 to prevent multiple rows error
          
        if (findError) {
          logger.error('Error checking for existing character:', findError);
        } else if (existingCharacters && existingCharacters.length > 0) {
          existingCharacterId = existingCharacters[0].id;
          setSupabaseCharacterId(existingCharacterId);
        }
      }
      
      // Prepare character data for Supabase
      const supabaseCharacter = {
        user_id: userId,
        name: characterData.name,
        class_id: characterData.class.id,
        level: characterData.level,
        stats: characterData.stats,
        hit_points: characterData.hitPoints,
        max_hit_points: characterData.maxHitPoints,
        armor_class: characterData.armorClass,
        proficiency_bonus: characterData.proficiencyBonus,
        experience: characterData.experience,
        background: characterData.background,
        inventory: characterData.inventory,
        spells: characterData.spells || [],
        skills_data: characterData.skillsData || {},
        saving_throws_data: characterData.savingThrowsData || {},
        equipment_slots: characterData.equipmentSlots || {},
        spell_slots: characterData.spellSlots || {}
      };
      
      if (existingCharacterId) {
        // Update existing character
        const { error: updateError } = await supabase
          .from('characters')
          .update(supabaseCharacter)
          .eq('id', existingCharacterId);
          
        if (updateError) {
          logger.error('Error updating character in Supabase:', updateError);
        } else {
          logger.info('Character updated in Supabase successfully');
        }
      } else {
        // Create new character
        const { data: newCharacter, error: insertError } = await supabase
          .from('characters')
          .insert(supabaseCharacter)
          .select('id')
          .single();
          
        if (insertError) {
          logger.error('Error creating character in Supabase:', insertError);
        } else if (newCharacter) {
          logger.info(`Character created in Supabase with ID: ${newCharacter.id}`);
          setSupabaseCharacterId(newCharacter.id);
        }
      }
    } catch (error) {
      logger.error('Error syncing character to Supabase:', error);
    }
  };

  // Save character to localStorage whenever it changes
  useEffect(() => {
    if (character) {
      localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(character));
      
      // Sync to Supabase if we have a user
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          syncCharacterToSupabase(character);
        }
      });
    }
  }, [character]);

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

  const generateSkillsData = (stats: any, characterClass: any, proficiencyBonus: number): CharacterSkillsData => {
    const getModifier = (score: number) => Math.floor((score - 10) / 2);
    const skillAbilities = {
      acrobatics: 'dexterity',
      animalHandling: 'wisdom',
      arcana: 'intelligence',
      athletics: 'strength',
      deception: 'charisma',
      history: 'intelligence',
      insight: 'wisdom',
      intimidation: 'charisma',
      investigation: 'intelligence',
      medicine: 'wisdom',
      nature: 'intelligence',
      perception: 'wisdom',
      performance: 'charisma',
      persuasion: 'charisma',
      religion: 'intelligence',
      sleightOfHand: 'dexterity',
      stealth: 'dexterity',
      survival: 'wisdom',
    };

    const skillsData: CharacterSkillsData = {};
    
    Object.entries(skillAbilities).forEach(([skill, ability]) => {
      const abilityScore = ability as keyof typeof stats;
      const baseModifier = getModifier(stats[abilityScore]);
      const isProficient = characterClass.skillProficiencies?.includes(skill) || false;
      
      skillsData[skill] = {
        modifier: baseModifier + (isProficient ? proficiencyBonus : 0),
        isProficient,
        isExpertise: false, // Can be updated later for rogues, bards, etc.
        abilityScore
      };
    });

    return skillsData;
  };

  const generateSavingThrowsData = (stats: any, characterClass: any, proficiencyBonus: number): SavingThrowsData => {
    const getModifier = (score: number) => Math.floor((score - 10) / 2);
    const savingThrowsData: SavingThrowsData = {};
    
    Object.entries(stats).forEach(([ability, score]) => {
      const abilityScore = ability as keyof typeof stats;
      const baseModifier = getModifier(score as number);
      const isProficient = characterClass.savingThrows?.includes(ability) || false;
      
      savingThrowsData[ability] = {
        modifier: baseModifier + (isProficient ? proficiencyBonus : 0),
        isProficient,
        abilityScore
      };
    });

    return savingThrowsData;
  };

  const generateSpellSlots = (characterClass: any, level: number) => {
    if (!characterClass.spellcaster) return {};
    
    // Simplified spell slot progression for full casters
    const spellSlotTable: { [level: number]: number[] } = {
      1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
      2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
      3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
      4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
      5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    };

    const slots = spellSlotTable[Math.min(level, 5)] || [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const spellSlots: any = {};
    
    slots.forEach((count, index) => {
      if (count > 0) {
        spellSlots[`level${index + 1}`] = { current: count, max: count };
      }
    });

    return spellSlots;
  };

  const saveCharacter = useCallback(async (newCharacter: Character) => {
    const updatedCharacter = {
      ...newCharacter,
      temporaryHitPoints: 0,
      skills: generateDefaultSkills(newCharacter.stats, newCharacter.class, newCharacter.proficiencyBonus),
      savingThrows: generateDefaultSavingThrows(newCharacter.stats, newCharacter.class, newCharacter.proficiencyBonus),
      conditions: [],
      luck: 3,
      inspiration: false,
      deathSaves: { successes: 0, failures: 0 },
      skillsData: generateSkillsData(newCharacter.stats, newCharacter.class, newCharacter.proficiencyBonus),
      savingThrowsData: generateSavingThrowsData(newCharacter.stats, newCharacter.class, newCharacter.proficiencyBonus),
      equipmentSlots: {},
      spellSlots: generateSpellSlots(newCharacter.class, newCharacter.level),
      updatedAt: Date.now(),
    };
    
    setCharacter(updatedCharacter);
    
    // Sync to Supabase if we have a user
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await syncCharacterToSupabase(updatedCharacter);
    }
  }, []);

  const updateCharacter = useCallback((updates: Partial<Character>) => {
    setCharacter(prev => {
      if (!prev) return null;
      
      const updated = {
        ...prev,
        ...updates,
        updatedAt: Date.now(),
      };

      // Recalculate skills and saving throws if stats or level changed
      if (updates.stats || updates.level || updates.proficiencyBonus) {
        updated.skillsData = generateSkillsData(updated.stats, updated.class, updated.proficiencyBonus);
        updated.savingThrowsData = generateSavingThrowsData(updated.stats, updated.class, updated.proficiencyBonus);
        updated.skills = generateDefaultSkills(updated.stats, updated.class, updated.proficiencyBonus);
        updated.savingThrows = generateDefaultSavingThrows(updated.stats, updated.class, updated.proficiencyBonus);
      }

      // Recalculate spell slots if level changed and character is a spellcaster
      if (updates.level && updated.class.spellcaster) {
        updated.spellSlots = generateSpellSlots(updated.class, updated.level);
      }

      return updated;
    });
  }, []);

  const equipItem = useCallback((item: InventoryItem, slot?: keyof EquipmentSlots) => {
    if (!character || !item.isEquippable) return false;

    const targetSlot = slot || item.equipmentSlot;
    if (!targetSlot) return false;

    setCharacter(prev => {
      if (!prev) return null;

      const newEquipmentSlots = { ...prev.equipmentSlots };
      const newInventory = [...prev.inventory];

      // Unequip current item in slot if any
      if (newEquipmentSlots[targetSlot]) {
        const currentItem = newEquipmentSlots[targetSlot];
        if (currentItem) {
          currentItem.isEquipped = false;
          // Add back to inventory if not already there
          const existingIndex = newInventory.findIndex(i => i.id === currentItem.id);
          if (existingIndex === -1) {
            newInventory.push(currentItem);
          }
        }
      }

      // Equip new item
      const itemIndex = newInventory.findIndex(i => i.id === item.id);
      if (itemIndex >= 0) {
        newInventory[itemIndex] = { ...item, isEquipped: true };
        newEquipmentSlots[targetSlot] = newInventory[itemIndex];
      }

      // Recalculate AC if armor was equipped
      let newArmorClass = prev.armorClass;
      if (item.type === 'armor' && item.armorClassBonus) {
        const baseAC = 10 + DiceRoller.getModifier(prev.stats.dexterity);
        newArmorClass = baseAC + item.armorClassBonus;
      }

      return {
        ...prev,
        inventory: newInventory,
        equipmentSlots: newEquipmentSlots,
        armorClass: newArmorClass,
        updatedAt: Date.now(),
      };
    });

    return true;
  }, [character]);

  const unequipItem = useCallback((slot: keyof EquipmentSlots) => {
    if (!character) return false;

    setCharacter(prev => {
      if (!prev || !prev.equipmentSlots?.[slot]) return prev;

      const newEquipmentSlots = { ...prev.equipmentSlots };
      const unequippedItem = newEquipmentSlots[slot];
      
      if (unequippedItem) {
        unequippedItem.isEquipped = false;
        delete newEquipmentSlots[slot];

        // Recalculate AC if armor was unequipped
        let newArmorClass = prev.armorClass;
        if (unequippedItem.type === 'armor') {
          newArmorClass = 10 + DiceRoller.getModifier(prev.stats.dexterity);
        }

        return {
          ...prev,
          equipmentSlots: newEquipmentSlots,
          armorClass: newArmorClass,
          updatedAt: Date.now(),
        };
      }

      return prev;
    });

    return true;
  }, [character]);

  const useConsumableItem = useCallback((itemId: string) => {
    if (!character) return false;

    const item = character.inventory.find(i => i.id === itemId);
    if (!item || item.type !== 'potion') return false;

    setCharacter(prev => {
      if (!prev) return null;

      const newInventory = prev.inventory.filter(i => i.id !== itemId);
      let newHitPoints = prev.hitPoints;

      // Apply item effects
      if (item.name.toLowerCase().includes('health') || item.name.toLowerCase().includes('healing')) {
        const healing = DiceRoller.damageRoll('2d4', 2);
        newHitPoints = Math.min(prev.maxHitPoints, prev.hitPoints + healing.total);
      }

      return {
        ...prev,
        inventory: newInventory,
        hitPoints: newHitPoints,
        updatedAt: Date.now(),
      };
    });

    return true;
  }, [character]);

  const clearCharacter = useCallback(() => {
    setCharacter(null);
    localStorage.removeItem(CHARACTER_STORAGE_KEY);
  }, []);

  const hasCharacter = useCallback(() => {
    return character !== null;
  }, [character]);

  // Enhanced level up with D&D 5e mechanics
  const levelUpCharacter = useCallback(() => {
    if (!character) return;

    const newLevel = character.level + 1;
    
    // Calculate hit point increase based on class hit die
    const hitDieRoll = DiceRoller.roll(character.class.hitDie);
    const constitutionModifier = DiceRoller.getModifier(character.stats.constitution);
    const hitPointIncrease = Math.max(1, hitDieRoll + constitutionModifier);
    
    // Update proficiency bonus
    const newProficiencyBonus = DiceRoller.getProficiencyBonus(newLevel);
    
    updateCharacter({
      level: newLevel,
      experience: 0,
      maxHitPoints: character.maxHitPoints + hitPointIncrease,
      hitPoints: character.hitPoints + hitPointIncrease,
      proficiencyBonus: newProficiencyBonus,
    });
  }, [character, updateCharacter]);

  // Add experience points with level up check
  const gainExperience = useCallback((xp: number) => {
    if (!character) return;

    const newExperience = character.experience + xp;
    
    // D&D 5e XP thresholds
    const xpThresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
    const xpNeededForNextLevel = xpThresholds[character.level] || xpThresholds[19];

    if (newExperience >= xpNeededForNextLevel && character.level < 20) {
      levelUpCharacter();
    } else {
      updateCharacter({ experience: newExperience });
    }
  }, [character, updateCharacter, levelUpCharacter]);

  // Enhanced damage system with death saves
  const takeDamage = useCallback((damage: number) => {
    if (!character) return;

    const totalDamage = Math.max(0, damage - character.temporaryHitPoints);
    const newTempHP = Math.max(0, character.temporaryHitPoints - damage);
    const newHitPoints = Math.max(0, character.hitPoints - totalDamage);
    
    // Check for massive damage (damage >= max HP)
    const massiveDamage = totalDamage >= character.maxHitPoints;
    
    // Check for instant death (damage reduces HP to negative max HP)
    const instantDeath = (character.hitPoints - totalDamage) <= -character.maxHitPoints;
    
    updateCharacter({ 
      hitPoints: newHitPoints,
      temporaryHitPoints: newTempHP
    });

    // Return damage result for game state processing
    return {
      newHitPoints,
      isDying: newHitPoints === 0 && !instantDeath,
      isDead: instantDeath,
      massiveDamage,
      actualDamage: totalDamage
    };
  }, [character, updateCharacter]);

  // Heal character
  const healCharacter = useCallback((healing: number) => {
    if (!character) return;

    const newHitPoints = Math.min(character.maxHitPoints, character.hitPoints + healing);
    updateCharacter({ hitPoints: newHitPoints });
    
    return {
      newHitPoints,
      actualHealing: newHitPoints - character.hitPoints
    };
  }, [character, updateCharacter]);

  // Add temporary hit points
  const addTemporaryHitPoints = useCallback((tempHP: number) => {
    if (!character) return;
    
    // Temporary HP doesn't stack, take the higher value
    const newTempHP = Math.max(character.temporaryHitPoints, tempHP);
    updateCharacter({ temporaryHitPoints: newTempHP });
  }, [character, updateCharacter]);

  // Use luck point (Halfling Lucky, Lucky feat)
  const useLuck = useCallback(() => {
    if (!character || character.luck <= 0) return false;
    
    updateCharacter({ luck: character.luck - 1 });
    return true;
  }, [character, updateCharacter]);

  // Grant inspiration
  const grantInspiration = useCallback(() => {
    if (!character) return;
    updateCharacter({ inspiration: true });
  }, [character, updateCharacter]);

  // Use inspiration
  const useInspiration = useCallback(() => {
    if (!character || !character.inspiration) return false;
    
    updateCharacter({ inspiration: false });
    return true;
  }, [character, updateCharacter]);

  // Add condition
  const addCondition = useCallback((condition: { name: string; description: string; duration: number; source: string }) => {
    if (!character) return;
    
    const newConditions = [...character.conditions, condition];
    updateCharacter({ conditions: newConditions });
  }, [character, updateCharacter]);

  // Remove condition
  const removeCondition = useCallback((conditionName: string) => {
    if (!character) return;
    
    const newConditions = character.conditions.filter(c => c.name !== conditionName);
    updateCharacter({ conditions: newConditions });
  }, [character, updateCharacter]);

  // Long rest (restore HP, spell slots, abilities)
  const longRest = useCallback(() => {
    if (!character) return;
    
    const restoredSpellSlots = { ...character.spellSlots };
    Object.keys(restoredSpellSlots).forEach(level => {
      restoredSpellSlots[level].current = restoredSpellSlots[level].max;
    });
    
    updateCharacter({
      hitPoints: character.maxHitPoints,
      temporaryHitPoints: 0,
      luck: 3,
      deathSaves: { successes: 0, failures: 0 },
      conditions: character.conditions.filter(c => c.duration === -1),
      spellSlots: restoredSpellSlots
    });
  }, [character, updateCharacter]);

  // Short rest (restore some HP, some abilities)
  const shortRest = useCallback(() => {
    if (!character) return;
    
    // Roll hit dice for healing (simplified - using 1 hit die)
    const hitDieRoll = DiceRoller.roll(character.class.hitDie);
    const constitutionModifier = DiceRoller.getModifier(character.stats.constitution);
    const healing = Math.max(1, hitDieRoll + constitutionModifier);
    
    const newHitPoints = Math.min(character.maxHitPoints, character.hitPoints + healing);
    updateCharacter({ hitPoints: newHitPoints });
    
    return { healing: newHitPoints - character.hitPoints };
  }, [character, updateCharacter]);

  return {
    character,
    isLoading,
    saveCharacter,
    updateCharacter,
    clearCharacter,
    hasCharacter,
    levelUpCharacter,
    gainExperience,
    takeDamage,
    healCharacter,
    addTemporaryHitPoints,
    useLuck,
    grantInspiration,
    useInspiration,
    addCondition,
    removeCondition,
    longRest,
    shortRest,
    equipItem,
    unequipItem,
    useConsumableItem,
    supabaseCharacterId
  };
}