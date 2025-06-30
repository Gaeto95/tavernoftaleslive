import React from 'react';

interface CharacterNameInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function CharacterNameInput({ value, onChange }: CharacterNameInputProps) {
  return (
    <div className="max-w-md mx-auto">
      <label htmlFor="character-name" className="block text-amber-400 text-lg mb-2">
        Character Name
      </label>
      <input
        id="character-name"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your character's name"
        className="w-full p-4 bg-gray-900/80 border-2 border-amber-600/50 rounded-lg text-amber-100 placeholder-amber-600/50 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        required
      />
    </div>
  );
}