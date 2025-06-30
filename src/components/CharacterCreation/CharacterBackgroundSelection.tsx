import React from 'react';
import { Book, Users, Crown, Tent, Scroll, Sword } from 'lucide-react';

interface CharacterBackgroundSelectionProps {
  selectedBackground: string;
  onSelectBackground: (background: string) => void;
}

export function CharacterBackgroundSelection({ selectedBackground, onSelectBackground }: CharacterBackgroundSelectionProps) {
  const backgrounds = [
    { id: 'acolyte', name: 'Acolyte', icon: Book, description: 'You have spent your life in service to a temple, learning sacred rites and providing sacrifices.' },
    { id: 'criminal', name: 'Criminal', icon: Skull, description: 'You are an experienced criminal with a history of breaking the law and connections to the underworld.' },
    { id: 'folk-hero', name: 'Folk Hero', icon: Users, description: 'You come from a humble background, but you are destined for so much more.' },
    { id: 'noble', name: 'Noble', icon: Crown, description: 'You understand wealth, power, and privilege. You carry a noble title and your family owns land.' },
    { id: 'sage', name: 'Sage', icon: Scroll, description: 'You spent years learning the lore of the multiverse, studying ancient tomes and manuscripts.' },
    { id: 'soldier', name: 'Soldier', icon: Sword, description: 'War has been your life for as long as you care to remember, trained in techniques of combat.' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {backgrounds.map((background) => {
        const Icon = background.icon;
        const isSelected = selectedBackground === background.id;
        
        return (
          <div
            key={background.id}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
              isSelected
                ? 'border-amber-400 bg-amber-900/30 transform scale-105'
                : 'border-amber-600/30 hover:border-amber-500 hover:bg-amber-900/20 hover:scale-105'
            }`}
            onClick={() => onSelectBackground(background.id)}
          >
            <div className="flex items-center mb-2">
              <div className={`p-2 rounded-full ${isSelected ? 'bg-amber-600' : 'bg-amber-900/50'}`}>
                <Icon className={`w-6 h-6 ${isSelected ? 'text-black' : 'text-amber-400'}`} />
              </div>
              <h3 className="text-xl text-amber-300 ml-3">{background.name}</h3>
            </div>
            <p className="text-amber-200 text-sm">{background.description}</p>
          </div>
        );
      })}
    </div>
  );
}