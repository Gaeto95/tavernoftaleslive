import React, { useState } from 'react';
import { FloatingEmbers } from './FloatingEmbers';
import { BackgroundMusic } from './BackgroundMusic';
import { Character, InventoryItem, EquipmentSlots } from '../types/character';
import { CharacterCreation3D } from './CharacterCreation3D';
import { CharacterSheet3D } from './CharacterSheet3D';

interface CharacterManagement3DProps {
  mode: 'creation' | 'sheet';
  character: Character | null;
  onCharacterCreated: (character: Character) => void;
  onClose: () => void;
  onBackToHome?: () => void;
  // Character functions
  equipItem?: (item: InventoryItem, slot: keyof EquipmentSlots) => void;
  unequipItem?: (slot: keyof EquipmentSlots) => void;
  useItem?: (itemId: string) => void;
}

export function CharacterManagement3D({
  mode,
  character,
  onCharacterCreated,
  onClose,
  onBackToHome,
  equipItem,
  unequipItem,
  useItem
}: CharacterManagement3DProps) {
  
  const handleCharacterCreated = (newCharacter: Character) => {
    onCharacterCreated(newCharacter);
  };

  return (
    <div className="relative">
      <FloatingEmbers />
      <BackgroundMusic volume={0.07} autoPlay={true} />
      
      {/* Home Button */}
      {onBackToHome && (
        <button
          onClick={onBackToHome}
          className="fixed top-4 right-4 z-50 inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-amber-600 text-amber-300 hover:bg-gray-800 transition-colors text-sm"
        >
          <span>Home</span>
        </button>
      )}
      
      {mode === 'creation' ? (
        <CharacterCreation3D
          onCharacterCreated={handleCharacterCreated}
          onCancel={onClose}
        />
      ) : mode === 'sheet' && character ? (
        <CharacterSheet3D
          character={character}
          onClose={onClose}
          onEquipItem={equipItem}
          onUnequipItem={unequipItem}
          onUseItem={useItem}
        />
      ) : (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="fantasy-title text-2xl text-amber-300 mb-4">No Character Available</h2>
            <button
              onClick={() => onClose()}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-600 rounded-lg text-white transition-colors"
            >
              Return
            </button>
          </div>
        </div>
      )}
    </div>
  );
}