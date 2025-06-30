import { EquipmentSlots } from './character';

export interface CharacterStats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface CharacterClass {
  id: string;
  name: string;
  description: string;
  hitDie: number;
  primaryStats: (keyof CharacterStats)[];
  savingThrows: (keyof CharacterStats)[];
  skillProficiencies: string[];
  startingEquipment: string[];
  classFeatures: ClassFeature[];
  spellcaster?: boolean;
}

export interface ClassFeature {
  name: string;
  description: string;
  level: number;
}

export interface Character {
  id: string;
  userId?: string;
  name: string;
  class: CharacterClass;
  level: number;
  stats: CharacterStats;
  hitPoints: number;
  maxHitPoints: number;
  temporaryHitPoints: number;
  armorClass: number;
  proficiencyBonus: number;
  experience: number;
  background: string;
  inventory: InventoryItem[];
  spells?: string[];
  skills: CharacterSkills;
  savingThrows: SavingThrows;
  conditions: Condition[];
  luck: number; // Luck points (0-3, resets on long rest)
  inspiration: boolean;
  deathSaves: {
    successes: number;
    failures: number;
  };
  // Enhanced data storage
  skillsData?: CharacterSkillsData;
  savingThrowsData?: SavingThrowsData;
  equipmentSlots?: EquipmentSlots;
  spellSlots?: SpellSlots;
  createdAt: number;
  updatedAt: number;
  // Character appearance
  appearance?: {
    modelIndex: number;
  };
}

export interface CharacterSkills {
  acrobatics: number;
  animalHandling: number;
  arcana: number;
  athletics: number;
  deception: number;
  history: number;
  insight: number;
  intimidation: number;
  investigation: number;
  medicine: number;
  nature: number;
  perception: number;
  performance: number;
  persuasion: number;
  religion: number;
  sleightOfHand: number;
  stealth: number;
  survival: number;
}

export interface CharacterSkillsData {
  [skillName: string]: {
    modifier: number;
    isProficient: boolean;
    isExpertise: boolean;
    abilityScore: keyof CharacterStats;
  };
}

export interface SavingThrows {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface SavingThrowsData {
  [ability: string]: {
    modifier: number;
    isProficient: boolean;
    abilityScore: keyof CharacterStats;
  };
}

export interface EquipmentSlots {
  mainHand?: InventoryItem;
  offHand?: InventoryItem;
  armor?: InventoryItem;
  helmet?: InventoryItem;
  boots?: InventoryItem;
  gloves?: InventoryItem;
  ring1?: InventoryItem;
  ring2?: InventoryItem;
  necklace?: InventoryItem;
  cloak?: InventoryItem;
}

export interface SpellSlots {
  [level: string]: {
    current: number;
    max: number;
  };
}

export interface Condition {
  name: string;
  description: string;
  duration: number; // rounds, -1 for permanent until removed
  source: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'weapon' | 'armor' | 'potion' | 'tool' | 'treasure' | 'spell_component';
  quantity?: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact';
  value?: number;
  weight?: number;
  properties?: string[];
  damage?: string;
  armorValue?: number;
  magicalProperties?: string[];
  requiresAttunement?: boolean;
  isAttuned?: boolean;
  isEquippable?: boolean;
  equipmentSlot?: keyof EquipmentSlots;
  isEquipped?: boolean;
  // Enhanced item properties
  armorClassBonus?: number;
  strengthRequirement?: number;
  stealthDisadvantage?: boolean;
  attackBonus?: number;
  damageBonus?: number;
  statBonuses?: Partial<CharacterStats>;
}

export interface GameSession {
  id: string;
  name: string;
  dungeonMaster: string;
  players: string[];
  characters: Character[];
  currentScene: string;
  storyHistory: StoryEntry[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StoryEntry {
  id: string;
  sessionId: string;
  characterId?: string;
  type: 'player' | 'dm' | 'system';
  content: string;
  timestamp: number;
  voiceUrl?: string;
  isPlaying?: boolean;
}