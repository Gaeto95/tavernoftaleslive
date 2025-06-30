import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useCharacterStore } from '../../stores/characterStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Character model component
function CharacterModel({ characterModel = 'a', animate = true }) {
  const group = useRef();
  
  // Try to load the GLB model
  let modelData;
  try {
    modelData = useGLTF(`/models/character-${characterModel}.glb`);
  } catch (e) {
    console.warn(`Could not load character-${characterModel}.glb, using fallback`);
    modelData = { nodes: {}, materials: {} };
  }
  
  const { nodes, materials } = modelData;
  
  // Animation
  useFrame((state) => {
    if (animate && group.current) {
      group.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  // If we have a valid model, render it
  if (nodes && Object.keys(nodes).length > 0) {
    // Apply a default pose to avoid T-pose
    const applyDefaultPose = (object) => {
      if (object.isSkinnedMesh && object.skeleton) {
        // Apply a simple idle pose to avoid T-pose
        const bones = object.skeleton.bones;
        
        // Loop through bones and apply subtle rotations for a natural pose
        bones.forEach(bone => {
          // Apply different rotations based on bone names
          if (bone.name.includes('Arm') || bone.name.includes('arm')) {
            // Slightly bend arms
            bone.rotation.z = (bone.name.includes('Left') || bone.name.includes('left')) ? 0.1 : -0.1;
            bone.rotation.x = 0.1;
          } else if (bone.name.includes('Hand') || bone.name.includes('hand')) {
            // Slightly curl fingers
            bone.rotation.x = 0.2;
          } else if (bone.name.includes('Leg') || bone.name.includes('leg')) {
            // Slightly bend legs
            bone.rotation.x = 0.05;
          }
        });
        
        // Update the skeleton
        object.skeleton.update();
      }
      
      // Apply to children recursively
      if (object.children) {
        object.children.forEach(child => applyDefaultPose(child));
      }
    };
    
    // Apply pose to the model
    const model = nodes.RootNode || nodes.Scene || Object.values(nodes)[0];
    if (model) {
      applyDefaultPose(model);
    }
    
    return (
      <group ref={group} dispose={null} position={[0, -1, 0]} scale={[0.6, 0.6, 0.6]}>
        <primitive object={model} />
      </group>
    );
  }
  
  // Fallback to a simple blocky character if model loading fails
  return (
    <group ref={group} dispose={null} position={[0, -1, 0]} scale={[0.6, 0.6, 0.6]}>
      {/* Body */}
      <mesh castShadow receiveShadow scale={1.5}>
        <boxGeometry args={[1, 1.5, 0.5]} />
        <meshStandardMaterial color="#d1a788" />
      </mesh>
      
      {/* Head */}
      <mesh castShadow position={[0, 1.25, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color="#d1a788" />
      </mesh>
      
      {/* Hair */}
      <mesh castShadow position={[0, 1.65, 0]}>
        <boxGeometry args={[0.85, 0.2, 0.85]} />
        <meshStandardMaterial color={characterModel === 'a' ? '#8b4513' : 
                                    characterModel === 'b' ? '#000000' : 
                                    characterModel === 'c' ? '#f5deb3' : 
                                    characterModel === 'd' ? '#b22222' : 
                                    characterModel === 'e' ? '#f5f5f5' : 
                                    characterModel === 'f' ? '#4169e1' : 
                                    characterModel === 'g' ? '#2e8b57' : 
                                    characterModel === 'h' ? '#800080' : 
                                    characterModel === 'i' ? '#8b4513' : 
                                    characterModel === 'j' ? '#000000' : 
                                    characterModel === 'k' ? '#f5deb3' : 
                                    characterModel === 'l' ? '#b22222' : 
                                    characterModel === 'm' ? '#f5f5f5' : 
                                    characterModel === 'n' ? '#4169e1' : 
                                    characterModel === 'o' ? '#2e8b57' : 
                                    characterModel === 'p' ? '#800080' : 
                                    characterModel === 'q' ? '#8b4513' : 
                                    '#000000'} />
      </mesh>
      
      {/* Arms - slightly bent to avoid T-pose */}
      <mesh castShadow position={[-0.75, 0.25, 0.2]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[0.25, 1, 0.25]} />
        <meshStandardMaterial color="#d1a788" />
      </mesh>
      <mesh castShadow position={[0.75, 0.25, 0.2]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[0.25, 1, 0.25]} />
        <meshStandardMaterial color="#d1a788" />
      </mesh>
      
      {/* Legs - slightly bent to avoid T-pose */}
      <mesh castShadow position={[-0.25, -1.25, 0.1]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.25, 1, 0.25]} />
        <meshStandardMaterial color="#d1a788" />
      </mesh>
      <mesh castShadow position={[0.25, -1.25, 0.1]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.25, 1, 0.25]} />
        <meshStandardMaterial color="#d1a788" />
      </mesh>
      
      {/* Armor */}
      <mesh castShadow position={[0, 0.25, 0.3]}>
        <boxGeometry args={[1.1, 1.6, 0.2]} />
        <meshStandardMaterial 
          color={characterModel === 'a' ? '#c0c0c0' : 
                characterModel === 'b' ? '#ffd700' : 
                characterModel === 'c' ? '#2c2c2c' : 
                characterModel === 'd' ? '#cd7f32' : 
                characterModel === 'e' ? '#4169e1' : 
                characterModel === 'f' ? '#b22222' : 
                characterModel === 'g' ? '#2e8b57' : 
                characterModel === 'h' ? '#800080' : 
                characterModel === 'i' ? '#c0c0c0' : 
                characterModel === 'j' ? '#ffd700' : 
                characterModel === 'k' ? '#2c2c2c' : 
                characterModel === 'l' ? '#cd7f32' : 
                characterModel === 'm' ? '#4169e1' : 
                characterModel === 'n' ? '#b22222' : 
                characterModel === 'o' ? '#2e8b57' : 
                characterModel === 'p' ? '#800080' : 
                characterModel === 'q' ? '#c0c0c0' : 
                '#c0c0c0'} 
          metalness={0.8} 
          roughness={0.2} 
        />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[-0.2, 1.25, 0.41]}>
        <boxGeometry args={[0.1, 0.1, 0.01]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0.2, 1.25, 0.41]}>
        <boxGeometry args={[0.1, 0.1, 0.01]} />
        <meshStandardMaterial color="white" />
      </mesh>
      
      {/* Pupils */}
      <mesh position={[-0.2, 1.25, 0.42]}>
        <boxGeometry args={[0.05, 0.05, 0.01]} />
        <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[0.2, 1.25, 0.42]}>
        <boxGeometry args={[0.05, 0.05, 0.01]} />
        <meshStandardMaterial color="black" />
      </mesh>
    </group>
  );
}

// Character Creator Component
export function CharacterCreator({ onCancel, onCreateCharacter, isCreating }) {
  const { appearance, updateAppearance } = useCharacterStore();
  const [selectedModel, setSelectedModel] = useState(appearance.characterModel || 'a');
  const [step, setStep] = useState(1);
  
  // Character model options (a through r)
  const characterModels = Array.from({ length: 18 }, (_, i) => String.fromCharCode(97 + i));
  
  // Update the character model in the store when selected
  const handleModelSelect = (model) => {
    setSelectedModel(model);
    updateAppearance({ characterModel: model });
  };
  
  // Navigate to previous/next model
  const handlePrevModel = () => {
    const currentIndex = characterModels.indexOf(selectedModel);
    const prevIndex = currentIndex <= 0 ? characterModels.length - 1 : currentIndex - 1;
    handleModelSelect(characterModels[prevIndex]);
  };
  
  const handleNextModel = () => {
    const currentIndex = characterModels.indexOf(selectedModel);
    const nextIndex = currentIndex >= characterModels.length - 1 ? 0 : currentIndex + 1;
    handleModelSelect(characterModels[nextIndex]);
  };

  const nextStep = () => {
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };
  
  return (
    <div className="flex flex-col h-full">
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="fantasy-title text-xl text-amber-300 text-center mb-4">
            Choose Your Appearance
          </h3>

          {/* 3D Preview with Navigation Arrows */}
          <div className="w-full h-72 relative">
            <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
              <CharacterModel characterModel={selectedModel} />
              <OrbitControls enableZoom={true} enablePan={false} minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
              <ContactShadows opacity={0.5} scale={10} blur={1} far={10} resolution={256} color="#000000" />
              <Environment preset="sunset" />
              <EffectComposer>
                <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} />
                <Vignette eskil={false} offset={0.1} darkness={0.2} />
              </EffectComposer>
            </Canvas>
            
            {/* Navigation Arrows */}
            <button 
              onClick={handlePrevModel}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-amber-900/80 hover:bg-amber-800 border-2 border-amber-600 rounded-full p-2 text-amber-300 transition-colors shadow-lg"
              aria-label="Previous character"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            
            <button 
              onClick={handleNextModel}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-amber-900/80 hover:bg-amber-800 border-2 border-amber-600 rounded-full p-2 text-amber-300 transition-colors shadow-lg"
              aria-label="Next character"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
            
            {/* Character Model Indicator */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-amber-900/80 backdrop-blur-sm border border-amber-600 rounded-lg px-4 py-2 text-amber-300">
              <span className="text-sm">{characterModels.indexOf(selectedModel) + 1} of {characterModels.length}</span>
            </div>
          </div>
          
          {/* Character Name Input */}
          <div className="mt-4 px-4">
            <input
              type="text"
              value={appearance.name}
              onChange={(e) => updateAppearance({ name: e.target.value })}
              placeholder="Character Name"
              className="w-full p-3 spell-input rounded-lg text-amber-50 text-center"
            />
          </div>

          <div className="flex justify-between space-x-4 mt-6">
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 border border-amber-600 rounded-lg text-amber-200 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={nextStep}
              disabled={!appearance.name}
              className="rune-button px-8 py-3 rounded-lg font-bold text-black disabled:opacity-50"
            >
              Next: Choose Class
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="fantasy-title text-xl text-amber-300 text-center mb-4">
            Choose Your Class
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-72 overflow-y-auto">
            {['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger', 'Barbarian'].map((characterClass) => (
              <button
                key={characterClass}
                onClick={() => updateAppearance({ class: characterClass })}
                className={`p-4 border-2 rounded-lg transition-all ${
                  appearance.class === characterClass
                    ? 'border-amber-400 bg-amber-900/30 shadow-lg shadow-amber-400/30'
                    : 'border-amber-600/30 hover:border-amber-500 hover:bg-amber-900/10'
                }`}
              >
                <h4 className="fantasy-title text-lg text-amber-300 mb-2">{characterClass}</h4>
                <p className="text-amber-200 text-sm">
                  {characterClass === 'Fighter' && "Master of martial combat, skilled with weapons and armor."}
                  {characterClass === 'Wizard' && "Scholar of arcane magic, wielding powerful spells."}
                  {characterClass === 'Rogue' && "Skilled in stealth, deception, and precision strikes."}
                  {characterClass === 'Cleric' && "Divine spellcaster with healing and support abilities."}
                  {characterClass === 'Ranger' && "Wilderness expert with tracking and archery skills."}
                  {characterClass === 'Barbarian' && "Fierce warrior with unmatched rage and resilience."}
                </p>
              </button>
            ))}
          </div>

          <div className="flex justify-between space-x-4 mt-6">
            <button
              onClick={prevStep}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 border border-amber-600 rounded-lg text-amber-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={nextStep}
              disabled={!appearance.class}
              className="rune-button px-8 py-3 rounded-lg font-bold text-black disabled:opacity-50"
            >
              Next: Choose Background
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="fantasy-title text-xl text-amber-300 text-center mb-4">
            Choose Your Background
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-72 overflow-y-auto">
            {['Acolyte', 'Criminal', 'Folk Hero', 'Noble', 'Sage', 'Soldier'].map((background) => (
              <button
                key={background}
                onClick={() => updateAppearance({ background })}
                className={`p-4 border-2 rounded-lg transition-all ${
                  appearance.background === background
                    ? 'border-amber-400 bg-amber-900/30 shadow-lg shadow-amber-400/30'
                    : 'border-amber-600/30 hover:border-amber-500 hover:bg-amber-900/10'
                }`}
              >
                <h4 className="fantasy-title text-lg text-amber-300 mb-2">{background}</h4>
                <p className="text-amber-200 text-sm">
                  {background === 'Acolyte' && "Devoted servant of a temple or religious order."}
                  {background === 'Criminal' && "Experienced in the underworld and illegal activities."}
                  {background === 'Folk Hero' && "Champion of the common people, known for a brave deed."}
                  {background === 'Noble' && "Born to privilege with connections to the aristocracy."}
                  {background === 'Sage' && "Scholar and researcher with extensive knowledge."}
                  {background === 'Soldier' && "Trained warrior who served in a military organization."}
                </p>
              </button>
            ))}
          </div>

          <div className="flex justify-between space-x-4 mt-6">
            <button
              onClick={prevStep}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 border border-amber-600 rounded-lg text-amber-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={nextStep}
              disabled={!appearance.background}
              className="rune-button px-8 py-3 rounded-lg font-bold text-black disabled:opacity-50"
            >
              Review Character
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h3 className="fantasy-title text-xl text-amber-300 text-center mb-4">
            Review Your Character
          </h3>

          {/* 3D Preview */}
          <div className="w-full h-48 relative">
            <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
              <CharacterModel characterModel={selectedModel} />
              <OrbitControls enableZoom={true} enablePan={false} minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
              <ContactShadows opacity={0.5} scale={10} blur={1} far={10} resolution={256} color="#000000" />
              <Environment preset="sunset" />
              <EffectComposer>
                <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} />
                <Vignette eskil={false} offset={0.1} darkness={0.2} />
              </EffectComposer>
            </Canvas>
          </div>

          {/* Character Summary */}
          <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4">
            <h4 className="fantasy-title text-xl text-amber-300 mb-4 text-center">Character Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-amber-300 font-bold mb-2">Basic Info</h5>
                <p className="text-amber-200">Name: <span className="text-amber-100">{appearance.name}</span></p>
                <p className="text-amber-200">Class: <span className="text-amber-100">{appearance.class}</span></p>
                <p className="text-amber-200">Background: <span className="text-amber-100">{appearance.background}</span></p>
                <p className="text-amber-200">Model: <span className="text-amber-100">{characterModels.indexOf(selectedModel) + 1} of {characterModels.length}</span></p>
              </div>
              <div>
                <h5 className="text-amber-300 font-bold mb-2">Character Notes</h5>
                <p className="text-amber-200 text-sm">
                  Your character's abilities and stats will be generated based on your class selection.
                  You'll be able to customize your character further as you progress through your adventure.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between space-x-4 mt-6">
            <button
              onClick={prevStep}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 border border-amber-600 rounded-lg text-amber-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={onCreateCharacter}
              disabled={isCreating}
              className="rune-button px-16 py-4 rounded-lg font-bold text-black text-lg fantasy-title"
            >
              {isCreating ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                  <span>Creating...</span>
                </div>
              ) : (
                'Begin Adventure!'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Preload the character models
for (let i = 0; i < 18; i++) {
  const char = String.fromCharCode(97 + i);
  try {
    useGLTF.preload(`/models/character-${char}.glb`);
  } catch (e) {
    console.warn(`Could not preload character-${char}.glb`);
  }
}