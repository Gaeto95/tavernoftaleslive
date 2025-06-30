export class DiceRoller {
  static roll(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  static rollMultiple(count: number, sides: number): number[] {
    return Array.from({ length: count }, () => this.roll(sides));
  }

  static rollWithAdvantage(sides: number): { result: number; rolls: number[] } {
    const roll1 = this.roll(sides);
    const roll2 = this.roll(sides);
    return {
      result: Math.max(roll1, roll2),
      rolls: [roll1, roll2]
    };
  }

  static rollWithDisadvantage(sides: number): { result: number; rolls: number[] } {
    const roll1 = this.roll(sides);
    const roll2 = this.roll(sides);
    return {
      result: Math.min(roll1, roll2),
      rolls: [roll1, roll2]
    };
  }

  // Standard D&D stat generation: 4d6, drop lowest
  static rollStat(): number {
    const rolls = this.rollMultiple(4, 6);
    rolls.sort((a, b) => b - a); // Sort descending
    return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0); // Take top 3
  }

  // Generate all 6 stats
  static generateStats(): { [key: string]: number } {
    return {
      strength: this.rollStat(),
      dexterity: this.rollStat(),
      constitution: this.rollStat(),
      intelligence: this.rollStat(),
      wisdom: this.rollStat(),
      charisma: this.rollStat(),
    };
  }

  // Point buy system (alternative to rolling)
  static pointBuyStats(allocations: { [key: string]: number }): { [key: string]: number } {
    const baseStats = {
      strength: 8,
      dexterity: 8,
      constitution: 8,
      intelligence: 8,
      wisdom: 8,
      charisma: 8,
    };

    // Add allocated points
    Object.keys(allocations).forEach(stat => {
      baseStats[stat as keyof typeof baseStats] += allocations[stat];
    });

    return baseStats;
  }

  // Calculate ability modifier
  static getModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  // Calculate proficiency bonus based on level
  static getProficiencyBonus(level: number): number {
    return Math.ceil(level / 4) + 1;
  }

  // D&D 5e Attack Roll
  static attackRoll(
    attackBonus: number, 
    advantage: boolean = false, 
    disadvantage: boolean = false,
    luck: boolean = false
  ): { total: number; roll: number; isCritical: boolean; isCriticalFail: boolean; rolls?: number[] } {
    let roll: number;
    let rolls: number[] = [];

    if (advantage && !disadvantage) {
      const advantageRoll = this.rollWithAdvantage(20);
      roll = advantageRoll.result;
      rolls = advantageRoll.rolls;
    } else if (disadvantage && !advantage) {
      const disadvantageRoll = this.rollWithDisadvantage(20);
      roll = disadvantageRoll.result;
      rolls = disadvantageRoll.rolls;
    } else {
      roll = this.roll(20);
    }

    // Luck can reroll 1s (Halfling Lucky trait)
    if (luck && roll === 1) {
      roll = this.roll(20);
    }

    const total = roll + attackBonus;
    const isCritical = roll === 20;
    const isCriticalFail = roll === 1;

    return { total, roll, isCritical, isCriticalFail, rolls };
  }

  // D&D 5e Saving Throw
  static savingThrow(
    saveBonus: number,
    dc: number,
    advantage: boolean = false,
    disadvantage: boolean = false,
    luck: boolean = false
  ): { success: boolean; total: number; roll: number; rolls?: number[] } {
    const attackResult = this.attackRoll(saveBonus, advantage, disadvantage, luck);
    return {
      success: attackResult.total >= dc,
      total: attackResult.total,
      roll: attackResult.roll,
      rolls: attackResult.rolls
    };
  }

  // D&D 5e Damage Roll
  static damageRoll(diceExpression: string, bonus: number = 0): { total: number; rolls: number[] } {
    // Parse dice expression like "1d8", "2d6", "1d10+2"
    const match = diceExpression.match(/(\d+)d(\d+)(?:\+(\d+))?/);
    if (!match) {
      return { total: bonus, rolls: [] };
    }

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const extraBonus = match[3] ? parseInt(match[3]) : 0;

    const rolls = this.rollMultiple(count, sides);
    const total = rolls.reduce((sum, roll) => sum + roll, 0) + bonus + extraBonus;

    return { total, rolls };
  }

  // D&D 5e Death Saving Throw
  static deathSavingThrow(): { success: boolean; roll: number; isCritical: boolean } {
    const roll = this.roll(20);
    const success = roll >= 10;
    const isCritical = roll === 20; // Natural 20 restores 1 HP
    
    return { success, roll, isCritical };
  }

  // Skill Check with proficiency
  static skillCheck(
    abilityModifier: number,
    proficiencyBonus: number,
    isProficient: boolean,
    advantage: boolean = false,
    disadvantage: boolean = false,
    luck: boolean = false
  ): { total: number; roll: number; rolls?: number[] } {
    const bonus = abilityModifier + (isProficient ? proficiencyBonus : 0);
    return this.attackRoll(bonus, advantage, disadvantage, luck);
  }

  // Initiative Roll
  static initiativeRoll(dexModifier: number): { total: number; roll: number } {
    const roll = this.roll(20);
    return { total: roll + dexModifier, roll };
  }

  // Random encounter/event roll
  static randomEvent(probability: number = 0.1): boolean {
    return Math.random() < probability;
  }

  // Luck point usage (Halfling racial trait, Lucky feat)
  static canUseLuck(luckPoints: number): boolean {
    return luckPoints > 0;
  }

  // Generate random treasure value
  static treasureValue(level: number): number {
    const baseValue = level * 10;
    const variance = this.roll(100);
    return Math.floor(baseValue * (0.5 + variance / 100));
  }

  // Critical hit damage (double dice)
  static criticalDamage(diceExpression: string, bonus: number = 0): { total: number; rolls: number[] } {
    const match = diceExpression.match(/(\d+)d(\d+)(?:\+(\d+))?/);
    if (!match) {
      return { total: bonus, rolls: [] };
    }

    const count = parseInt(match[1]) * 2; // Double the dice for critical
    const sides = parseInt(match[2]);
    const extraBonus = match[3] ? parseInt(match[3]) : 0;

    const rolls = this.rollMultiple(count, sides);
    const total = rolls.reduce((sum, roll) => sum + roll, 0) + bonus + extraBonus;

    return { total, rolls };
  }
}