import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useCharacterStore } from '../stores/characterStore';
import { supabase } from '../lib/supabase';
import { CHARACTER_CLASSES } from '../data/characterClasses';
import { DiceRoller } from '../utils/diceRoller';

interface CharacterCreation3DProps {
  onCharacterCreated: (character: any) => void;
  onCancel: () => void;
}

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
  
  // Rotation animation
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
        <meshStandardMaterial color="#8b4513" />
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
      
      {/* Armor (chest plate) */}
      <mesh castShadow position={[0, 0.25, 0.3]}>
        <boxGeometry args={[1.1, 1.6, 0.2]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
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

export function CharacterCreation3D({ onCharacterCreated, onCancel }: CharacterCreation3DProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { appearance, updateAppearance, saveAppearance } = useCharacterStore();
  const [step, setStep] = useState(1);
  const [characterModels] = useState(Array.from({ length: 18 }, (_, i) => String.fromCharCode(97 + i)));
  const [selectedModelIndex, setSelectedModelIndex] = useState(
    appearance.characterModel ? characterModels.indexOf(appearance.characterModel) : 0
  );
  
  // Load appearance on mount
  useEffect(() => {
    const loadSavedAppearance = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Get the most recent appearance for this user
          const { data, error } = await supabase
            .from('character_appearances')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (error && error.code !== 'PGRST116') {
            console.error('Error loading character appearance:', error);
            return;
          }
          
          if (data && data.appearance_data) {
            updateAppearance(data.appearance_data);
            console.log('Character appearance loaded successfully');
          }
        }
      } catch (error) {
        console.error('Failed to load character appearance:', error);
      }
    };
    
    loadSavedAppearance();
  }, [updateAppearance]);

  const createCharacter = async () => {
    if (!appearance.name) {
      setError('Please give your character a name');
      return;
    }
    
    if (!appearance.class) {
      setError('Please select a class for your character');
      return;
    }
    
    if (!appearance.background) {
      setError('Please select a background for your character');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      // Generate random stats
      const stats = DiceRoller.generateStats();
      
      // Determine class based on appearance
      const characterClass = appearance.class 
        ? CHARACTER_CLASSES.find(c => c.name.toLowerCase() === appearance.class?.toLowerCase()) 
        : CHARACTER_CLASSES[0];
      
      if (!characterClass) {
        throw new Error('Invalid character class');
      }
      
      const character = {
        id: crypto.randomUUID(),
        name: appearance.name,
        class: characterClass,
        level: 1,
        stats,
        hitPoints: calculateHitPoints(stats, characterClass),
        maxHitPoints: calculateHitPoints(stats, characterClass),
        armorClass: calculateArmorClass(stats),
        proficiencyBonus: 2, // Level 1 proficiency bonus
        experience: 0,
        background: appearance.background,
        inventory: characterClass.startingEquipment.map((item, index) => ({
          id: `start-${index}`,
          name: item,
          icon: 'sword',
          description: `Starting equipment: ${item}`,
          type: 'weapon',
          rarity: 'common',
          value: 10
        })),
        spells: characterClass.spellcaster ? ['Cantrip: Light', 'Level 1: Magic Missile'] : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        temporaryHitPoints: 0,
        skills: generateDefaultSkills(stats, characterClass, 2),
        savingThrows: generateDefaultSavingThrows(stats, characterClass, 2),
        conditions: [],
        luck: 3,
        inspiration: false,
        deathSaves: { successes: 0, failures: 0 },
        appearance: {
          modelIndex: characterModels.indexOf(appearance.characterModel)
        }
      };

      // Save to Supabase if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('Saving character to Supabase:', character.name);
        
        // First save the appearance
        await saveAppearance();
        
        // Prepare character data for Supabase
        const supabaseCharacter = {
          id: character.id,
          user_id: user.id,
          name: character.name,
          class_id: character.class.id,
          level: character.level,
          stats: character.stats,
          hit_points: character.hitPoints,
          max_hit_points: character.maxHitPoints,
          armor_class: character.armorClass,
          proficiency_bonus: character.proficiencyBonus,
          experience: character.experience,
          background: character.background,
          inventory: character.inventory,
          spells: character.spells
        };
        
        const { error: insertError } = await supabase
          .from('characters')
          .insert(supabaseCharacter);
        
        if (insertError) {
          console.error('Error saving character to Supabase:', insertError);
          setError('Failed to save character to server. Please try again.');
          setIsCreating(false);
          return;
        }
        
        console.log('Character saved to Supabase successfully');
      }

      onCharacterCreated(character);
    } catch (err) {
      console.error('Error creating character:', err);
      setError(err instanceof Error ? err.message : 'Failed to create character');
    } finally {
      setIsCreating(false);
    }
  };
  
  // Helper functions for character creation
  const calculateHitPoints = (stats: any, characterClass: any) => {
    const constitutionModifier = Math.floor((stats.constitution - 10) / 2);
    return characterClass.hitDie + constitutionModifier;
  };
  
  const calculateArmorClass = (stats: any) => {
    const dexModifier = Math.floor((stats.dexterity - 10) / 2);
    return 10 + dexModifier;
  };
  
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

  // Handle model change
  const handleModelChange = (direction: 'next' | 'previous') => {
    let newIndex;
    if (direction === 'next') {
      newIndex = (selectedModelIndex + 1) % characterModels.length;
    } else {
      newIndex = (selectedModelIndex - 1 + characterModels.length) % characterModels.length;
    }
    setSelectedModelIndex(newIndex);
    updateAppearance({ characterModel: characterModels[newIndex] });
  };

  // Navigation functions
  const nextStep = () => {
    if (step === 1 && !appearance.name) {
      setError('Please enter a character name');
      return;
    }
    
    if (step === 2 && !appearance.class) {
      setError('Please select a class');
      return;
    }
    
    if (step === 3 && !appearance.background) {
      setError('Please select a background');
      return;
    }
    
    setStep(step + 1);
    setError(null);
  };

  const prevStep = () => {
    setStep(step - 1);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="parchment-panel p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-4">
          <h2 className="fantasy-title text-3xl font-bold text-amber-300 mb-2 glow-text">
            Create Your Character
          </h2>
          <p className="text-amber-200">
            Choose your character model and begin your adventure
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-3 mb-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Step 1: Appearance */}
        {step === 1 && (
          <div>
            <h3 className="fantasy-title text-xl text-amber-300 text-center mb-3">
              Choose Your Appearance
            </h3>
            
            {/* Character Model Viewer */}
            <div className="w-full h-64 relative mb-4">
              <div className="absolute inset-0 bg-gray-900/50 rounded-lg border border-amber-600/30">
                <div className="w-full h-full flex items-center justify-center">
                  {/* 3D Character Preview */}
                  <div className="w-full h-full">
                    <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }}>
                      <ambientLight intensity={0.5} />
                      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                      <CharacterModel characterModel={characterModels[selectedModelIndex]} animate={true} />
                      <OrbitControls enableZoom={true} enablePan={false} minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
                      <ContactShadows opacity={0.5} scale={10} blur={1} far={10} resolution={256} color="#000000" />
                      <Environment preset="sunset" />
                      <EffectComposer>
                        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} />
                        <Vignette eskil={false} offset={0.1} darkness={0.2} />
                      </EffectComposer>
                    </Canvas>
                  </div>
                </div>
              </div>
              
              {/* Navigation Arrows */}
              <button 
                onClick={() => handleModelChange('previous')}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full bg-amber-800 text-amber-200 flex items-center justify-center hover:bg-amber-700 transition-colors"
                aria-label="Previous character"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              
              <button 
                onClick={() => handleModelChange('next')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full bg-amber-800 text-amber-200 flex items-center justify-center hover:bg-amber-700 transition-colors"
                aria-label="Next character"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
              
              {/* Character Model Indicator */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-amber-900/80 backdrop-blur-sm border border-amber-600 rounded-lg px-3 py-1 text-amber-300">
                <span className="text-sm">{selectedModelIndex + 1} of {characterModels.length}</span>
              </div>
            </div>
            
            {/* Character Name Input */}
            <div className="mb-4 px-4">
              <label htmlFor="character-name" className="block text-amber-400 text-sm mb-1">
                Character Name
              </label>
              <input
                id="character-name"
                type="text"
                value={appearance.name || ''}
                onChange={(e) => updateAppearance({ name: e.target.value })}
                placeholder="Enter your character's name"
                className="w-full p-3 bg-gray-900/80 border-2 border-amber-600/50 rounded-lg text-amber-100 placeholder-amber-600/50 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="flex justify-between mt-4">
              <button
                onClick={onCancel}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 border border-amber-600 rounded-lg text-amber-200 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={nextStep}
                disabled={!appearance.name}
                className="rune-button px-6 py-2 rounded-lg font-bold text-black disabled:opacity-50"
              >
                Next: Choose Class
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Class Selection */}
        {step === 2 && (
          <div>
            <h3 className="fantasy-title text-xl text-amber-300 text-center mb-3">
              Choose Your Class
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 h-64 overflow-y-auto pr-1">
              {['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger', 'Barbarian'].map((characterClass) => (
                <button
                  key={characterClass}
                  onClick={() => updateAppearance({ class: characterClass })}
                  className={`p-3 border-2 rounded-lg transition-all ${
                    appearance.class === characterClass
                      ? 'border-amber-400 bg-amber-900/30 shadow-lg shadow-amber-400/30'
                      : 'border-amber-600/30 hover:border-amber-500 hover:bg-amber-900/10'
                  }`}
                >
                  <h4 className="fantasy-title text-lg text-amber-300 mb-1">{characterClass}</h4>
                  <p className="text-amber-200 text-xs">
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

            <div className="flex justify-between mt-4">
              <button
                onClick={prevStep}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 border border-amber-600 rounded-lg text-amber-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                disabled={!appearance.class}
                className="rune-button px-6 py-2 rounded-lg font-bold text-black disabled:opacity-50"
              >
                Next: Choose Background
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Background Selection */}
        {step === 3 && (
          <div>
            <h3 className="fantasy-title text-xl text-amber-300 text-center mb-3">
              Choose Your Background
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 h-64 overflow-y-auto pr-1">
              {['Acolyte', 'Criminal', 'Folk Hero', 'Noble', 'Sage', 'Soldier'].map((background) => (
                <button
                  key={background}
                  onClick={() => updateAppearance({ background })}
                  className={`p-3 border-2 rounded-lg transition-all ${
                    appearance.background === background
                      ? 'border-amber-400 bg-amber-900/30 shadow-lg shadow-amber-400/30'
                      : 'border-amber-600/30 hover:border-amber-500 hover:bg-amber-900/10'
                  }`}
                >
                  <h4 className="fantasy-title text-lg text-amber-300 mb-1">{background}</h4>
                  <p className="text-amber-200 text-xs">
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

            <div className="flex justify-between mt-4">
              <button
                onClick={prevStep}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 border border-amber-600 rounded-lg text-amber-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                disabled={!appearance.background}
                className="rune-button px-6 py-2 rounded-lg font-bold text-black disabled:opacity-50"
              >
                Review Character
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div>
            <h3 className="fantasy-title text-xl text-amber-300 text-center mb-3">
              Review Your Character
            </h3>

            {/* Character Preview */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              {/* 3D Preview */}
              <div className="w-full md:w-1/3 h-40 bg-gray-900/50 rounded-lg border border-amber-600/30">
                <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }}>
                  <ambientLight intensity={0.5} />
                  <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                  <CharacterModel characterModel={characterModels[selectedModelIndex]} animate={true} />
                  <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
                  <ContactShadows opacity={0.5} scale={10} blur={1} far={10} resolution={256} color="#000000" />
                  <Environment preset="sunset" />
                  <EffectComposer>
                    <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} />
                    <Vignette eskil={false} offset={0.1} darkness={0.2} />
                  </EffectComposer>
                </Canvas>
              </div>
              
              {/* Character Summary */}
              <div className="w-full md:w-2/3 bg-amber-900/20 border border-amber-600/30 rounded-lg p-4">
                <h4 className="fantasy-title text-lg text-amber-300 mb-4 text-center">Character Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <h5 className="text-amber-300 font-bold mb-1 text-sm">Basic Info</h5>
                    <p className="text-amber-200 text-sm">Name: <span className="text-amber-100">{appearance.name}</span></p>
                    <p className="text-amber-200 text-sm">Class: <span className="text-amber-100">{appearance.class}</span></p>
                    <p className="text-amber-200 text-sm">Background: <span className="text-amber-100">{appearance.background}</span></p>
                  </div>
                  <div>
                    <h5 className="text-amber-300 font-bold mb-1 text-sm">Character Notes</h5>
                    <p className="text-amber-200 text-xs">
                      Your character's abilities and stats will be generated based on your class selection.
                      You'll be able to customize your character further as you progress through your adventure.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <button
                onClick={prevStep}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 border border-amber-600 rounded-lg text-amber-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={createCharacter}
                disabled={isCreating}
                className="rune-button px-8 py-2 rounded-lg font-bold text-black disabled:opacity-50"
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
    </div>
  );
}