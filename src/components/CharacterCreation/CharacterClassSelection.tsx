import React from 'react';
import { Sword, Wand, Skull, Shield, Feather, Crosshair } from 'lucide-react';

interface CharacterClassSelectionProps {
  selectedClass: string;
  onSelectClass: (className: string) => void;
}

export function CharacterClassSelection({ selectedClass, onSelectClass }: CharacterClassSelectionProps) {
  const classes = [
    { id: 'fighter', name: 'Fighter', icon: Sword, description: 'Masters of martial combat, skilled with a variety of weapons and armor.' },
    { id: 'wizard', name: 'Wizard', icon: Wand, description: 'Scholarly magic-users capable of manipulating the structures of reality.' },
    { id: 'rogue', name: 'Rogue', icon: Skull, description: 'Stealthy adventurers who prefer to solve problems with cunning and skill.' },
    { id: 'cleric', name: 'Cleric', icon: Shield, description: 'Priestly champions who wield divine magic in service of a higher power.' },
    { id: 'ranger', name: 'Ranger', icon: Crosshair, description: 'Warriors of the wilderness, skilled in tracking, survival, and combat.' },
    { id: 'barbarian', name: 'Barbarian', icon: Feather, description: 'Fierce warriors who can enter a battle rage, drawing on primal forces.' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {classes.map((characterClass) => {
        const Icon = characterClass.icon;
        const isSelected = selectedClass === characterClass.id;
        
        return (
          <div
            key={characterClass.id}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
              isSelected
                ? 'border-amber-400 bg-amber-900/30 transform scale-105'
                : 'border-amber-600/30 hover:border-amber-500 hover:bg-amber-900/20 hover:scale-105'
            }`}
            onClick={() => onSelectClass(characterClass.id)}
          >
            <div className="flex items-center mb-2">
              <div className={`p-2 rounded-full ${isSelected ? 'bg-amber-600' : 'bg-amber-900/50'}`}>
                <Icon className={`w-6 h-6 ${isSelected ? 'text-black' : 'text-amber-400'}`} />
              </div>
              <h3 className="text-xl text-amber-300 ml-3">{characterClass.name}</h3>
            </div>
            <p className="text-amber-200 text-sm">{characterClass.description}</p>
          </div>
        );
      })}
    </div>
  );
}