import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CharacterModel } from '../../types/character';
import { CharacterModelViewer } from './CharacterModelViewer';
import { CharacterClassSelection } from './CharacterClassSelection';
import { CharacterBackgroundSelection } from './CharacterBackgroundSelection';
import { CharacterNameInput } from './CharacterNameInput';

interface CharacterCreationFlowProps {
  onCharacterCreated: (character: any) => void;
  onCancel: () => void;
}

export function CharacterCreationFlow({ onCharacterCreated, onCancel }: CharacterCreationFlowProps) {
  const [step, setStep] = useState(1);
  const [characterName, setCharacterName] = useState('');
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedBackground, setSelectedBackground] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [totalModels] = useState(18); // Total number of available models
  
  const modelViewerRef = useRef<any>(null);

  // Character models are now managed by the CharacterModelViewer component
  
  const handleNextStep = () => {
    if (step === 1 && !characterName.trim()) {
      alert('Please enter a character name');
      return;
    }
    
    if (step === 3 && !selectedClass) {
      alert('Please select a class');
      return;
    }
    
    if (step === 4 && !selectedBackground) {
      alert('Please select a background');
      return;
    }
    
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleCreateCharacter();
    }
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCreateCharacter = async () => {
    if (!characterName || !selectedClass || !selectedBackground) {
      alert('Please complete all required fields');
      return;
    }

    setIsCreating(true);
    
    try {
      // Create character object
      const character = {
        id: crypto.randomUUID(),
        name: characterName,
        modelIndex: selectedModelIndex,
        class: selectedClass,
        background: selectedBackground,
        // Add other default properties as needed
        level: 1,
        experience: 0,
        health: 100,
        maxHealth: 100,
        // etc.
      };
      
      onCharacterCreated(character);
    } catch (error) {
      console.error('Error creating character:', error);
      alert('Failed to create character. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleModelChange = (direction: 'next' | 'previous') => {
    if (direction === 'next') {
      setSelectedModelIndex((prev) => (prev + 1) % totalModels);
    } else {
      setSelectedModelIndex((prev) => (prev - 1 + totalModels) % totalModels);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-6xl p-8 relative">
        <div className="border-2 border-amber-600/50 rounded-2xl p-8 bg-black/80 relative">
          <h1 className="text-4xl text-center font-bold text-amber-400 mb-4">Create Your Character</h1>
          <p className="text-center text-amber-200 mb-8">Choose your character model and begin your adventure</p>
          
          {step === 1 && (
            <div className="text-center mb-8">
              <h2 className="text-2xl text-amber-400 mb-6">Choose Your Appearance</h2>
              
              <div className="relative h-96 flex items-center justify-center mb-8">
                <CharacterModelViewer 
                  modelIndex={selectedModelIndex} 
                  ref={modelViewerRef}
                />
                
                <button 
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full bg-amber-800 text-amber-200 flex items-center justify-center hover:bg-amber-700 transition-colors"
                  onClick={() => handleModelChange('previous')}
                >
                  <ChevronLeft size={24} />
                </button>
                
                <button 
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full bg-amber-800 text-amber-200 flex items-center justify-center hover:bg-amber-700 transition-colors"
                  onClick={() => handleModelChange('next')}
                >
                  <ChevronRight size={24} />
                </button>
                
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-amber-800/80 px-4 py-2 rounded-full text-amber-200">
                  {selectedModelIndex + 1} of {totalModels}
                </div>
              </div>
              
              <CharacterNameInput 
                value={characterName}
                onChange={setCharacterName}
              />
            </div>
          )}
          
          {step === 2 && (
            <div className="text-center mb-8">
              <h2 className="text-2xl text-amber-400 mb-6">Choose Your Class</h2>
              <CharacterClassSelection 
                selectedClass={selectedClass}
                onSelectClass={setSelectedClass}
              />
            </div>
          )}
          
          {step === 3 && (
            <div className="text-center mb-8">
              <h2 className="text-2xl text-amber-400 mb-6">Choose Your Background</h2>
              <CharacterBackgroundSelection 
                selectedBackground={selectedBackground}
                onSelectBackground={setSelectedBackground}
              />
            </div>
          )}
          
          {step === 4 && (
            <div className="text-center mb-8">
              <h2 className="text-2xl text-amber-400 mb-6">Review Your Character</h2>
              <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-6 max-w-md mx-auto">
                <div className="h-48 flex items-center justify-center mb-4">
                  <CharacterModelViewer 
                    modelIndex={selectedModelIndex} 
                    scale={0.8}
                  />
                </div>
                <p className="text-amber-200 text-lg mb-2">Name: <span className="text-amber-100 font-bold">{characterName}</span></p>
                <p className="text-amber-200 text-lg mb-2">Class: <span className="text-amber-100 font-bold">{selectedClass}</span></p>
                <p className="text-amber-200 text-lg">Background: <span className="text-amber-100 font-bold">{selectedBackground}</span></p>
              </div>
            </div>
          )}
          
          <div className="flex justify-between mt-8">
            <button
              onClick={step === 1 ? onCancel : handlePreviousStep}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-amber-200 rounded-lg transition-colors"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            
            <button
              onClick={handleNextStep}
              disabled={isCreating}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <span>Creating...</span>
              ) : step < 4 ? (
                <span>Next: {step === 1 ? 'Choose Class' : step === 2 ? 'Choose Background' : 'Review'}</span>
              ) : (
                <span>Begin Adventure!</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}