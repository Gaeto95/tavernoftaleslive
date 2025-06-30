import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Sky, Stars, PointerLockControls, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useCharacterStore } from '../../stores/characterStore';
import { useLobbyStore } from '../../stores/lobbyStore';
import { supabase } from '../../lib/supabase';
import { TavernEnvironment } from './TavernEnvironment';
import { TavernLighting } from './TavernLighting';
import { AtmosphericParticles } from './AtmosphericParticles';
import { EnhancedFireplace } from './EnhancedFireplace';
import { SessionTable } from './SessionTable';

interface MultiplayerLobbyProps {
  onJoinSession: (session: any) => void;
  onCreateSession: () => void;
  onBackToHome?: () => void;
  toggleLobbyMode?: () => void;
}

// Player character model
function PlayerCharacter({ appearance, position, isCurrentPlayer = false }) {
  const group = useRef();
  
  // Choose a character model based on appearance
  const characterId = appearance.characterModel || 'a';
  
  // Try to load the model, but have a fallback
  let modelData;
  try {
    modelData = useGLTF(`/models/character-${characterId}.glb`);
  } catch (e) {
    console.warn(`Could not load character-${characterId}.glb, using fallback`);
    modelData = { nodes: {}, materials: {} };
  }
  
  const { nodes, materials } = modelData;
  
  // Animation
  useFrame((state) => {
    if (group.current && !isCurrentPlayer) {
      // Idle animation for other players
      group.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1;
    }
  });

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

  // Get colors based on appearance
  const getSkinColor = () => {
    switch(appearance.skin) {
      case 'light': return '#ffe0bd';
      case 'medium': return '#d1a788';
      case 'dark': return '#8d5524';
      case 'elf': return '#c8e6c9';
      case 'orc': return '#8bc34a';
      case 'undead': return '#b0bec5';
      default: return '#d1a788';
    }
  };
  
  const getHairColor = () => {
    switch(appearance.hairColor) {
      case 'black': return '#000000';
      case 'brown': return '#8b4513';
      case 'blonde': return '#f5deb3';
      case 'red': return '#b22222';
      case 'white': return '#f5f5f5';
      case 'blue': return '#4169e1';
      case 'green': return '#2e8b57';
      case 'purple': return '#800080';
      default: return '#8b4513';
    }
  };
  
  const getArmorColor = () => {
    switch(appearance.armorColor) {
      case 'silver': return '#c0c0c0';
      case 'gold': return '#ffd700';
      case 'black': return '#2c2c2c';
      case 'bronze': return '#cd7f32';
      case 'blue': return '#4169e1';
      case 'red': return '#b22222';
      case 'green': return '#2e8b57';
      case 'purple': return '#800080';
      default: return '#c0c0c0';
    }
  };

  // If we have a valid model, render it with pose fix
  if (nodes && Object.keys(nodes).length > 0) {
    // Apply pose to the model
    const model = nodes.RootNode || nodes.Scene || Object.values(nodes)[0];
    if (model) {
      applyDefaultPose(model);
    }
    
    return (
      <group ref={group} dispose={null} position={position} scale={[0.6, 0.6, 0.6]}>
        <primitive object={model} />
        
        {/* Player name tag */}
        <Text
          position={[0, 2.2, 0]}
          fontSize={0.3}
          color="#fbbf24"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {appearance.name || "Adventurer"}
        </Text>
      </group>
    );
  }

  // Fallback to a simple blocky character
  return (
    <group ref={group} dispose={null} position={position} scale={[0.6, 0.6, 0.6]}>
      {/* Body */}
      <mesh castShadow receiveShadow scale={1.5} position={[0, 0, 0]}>
        <boxGeometry args={[1, 1.5, 0.5]} />
        <meshStandardMaterial color={getSkinColor()} />
      </mesh>
      
      {/* Head */}
      <mesh castShadow position={[0, 1.25, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color={getSkinColor()} />
      </mesh>
      
      {/* Hair */}
      {appearance.hairStyle !== 'bald' && (
        <mesh castShadow position={[0, 1.65, 0]}>
          <boxGeometry args={[0.85, 0.2, 0.85]} />
          <meshStandardMaterial color={getHairColor()} />
        </mesh>
      )}
      
      {/* Arms - slightly bent to avoid T-pose */}
      <mesh castShadow position={[-0.75, 0.25, 0.2]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[0.25, 1, 0.25]} />
        <meshStandardMaterial color={getSkinColor()} />
      </mesh>
      <mesh castShadow position={[0.75, 0.25, 0.2]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[0.25, 1, 0.25]} />
        <meshStandardMaterial color={getSkinColor()} />
      </mesh>
      
      {/* Legs - slightly bent to avoid T-pose */}
      <mesh castShadow position={[-0.25, -1.25, 0.1]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.25, 1, 0.25]} />
        <meshStandardMaterial color={getSkinColor()} />
      </mesh>
      <mesh castShadow position={[0.25, -1.25, 0.1]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.25, 1, 0.25]} />
        <meshStandardMaterial color={getSkinColor()} />
      </mesh>
      
      {/* Armor (chest plate) */}
      {appearance.armor !== 'none' && (
        <mesh castShadow position={[0, 0.25, 0.3]}>
          <boxGeometry args={[1.1, 1.6, 0.2]} />
          <meshStandardMaterial color={getArmorColor()} />
        </mesh>
      )}
      
      {/* Player name tag */}
      <Text
        position={[0, 2.2, 0]}
        fontSize={0.3}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {appearance.name || "Adventurer"}
      </Text>
    </group>
  );
}

// First-person player controller
function PlayerController({ position, setPosition }) {
  const { camera } = useThree();
  const speed = 0.15;
  const keys = useRef({});
  
  useEffect(() => {
    const handleKeyDown = (e) => { keys.current[e.code] = true; };
    const handleKeyUp = (e) => { keys.current[e.code] = false; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  useFrame(() => {
    // Get camera direction
    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3(0, 0, Number(keys.current['KeyS']) - Number(keys.current['KeyW']));
    const sideVector = new THREE.Vector3(Number(keys.current['KeyD']) - Number(keys.current['KeyA']), 0, 0);
    
    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(speed)
      .applyEuler(camera.rotation);
    
    // Update position
    if (keys.current['KeyW'] || keys.current['KeyA'] || keys.current['KeyS'] || keys.current['KeyD']) {
      setPosition([
        position[0] - direction.x,
        position[1],
        position[2] - direction.z
      ]);
    }
  });
  
  return null;
}

// Main Multiplayer Lobby Component
export function MultiplayerLobby({ onJoinSession, onCreateSession, onBackToHome, toggleLobbyMode }: MultiplayerLobbyProps) {
  const { appearance } = useCharacterStore();
  const { sessions, loadSessions, players, addPlayer, removePlayer } = useLobbyStore();
  const [playerPosition, setPlayerPosition] = useState([0, 0, 10]);
  const [controlsEnabled, setControlsEnabled] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const controlsRef = useRef();
  
  // Load sessions on mount
  useEffect(() => {
    loadSessions();
    
    // Set up real-time subscription for players
    const playersSubscription = supabase
      .channel('lobby-players')
      .on('presence', { event: 'sync' }, () => {
        // Update players from presence state
        const state = playersSubscription.presenceState();
        const onlinePlayers = Object.values(state).flat();
        // Update store with online players
        onlinePlayers.forEach(player => addPlayer(player));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this user's presence
          await playersSubscription.track({
            user_id: appearance.id || 'anonymous',
            name: appearance.name || 'Adventurer',
            position: playerPosition,
            appearance
          });
        }
      });
      
    // Update player position in presence
    const updateInterval = setInterval(() => {
      playersSubscription.track({
        user_id: appearance.id || 'anonymous',
        name: appearance.name || 'Adventurer',
        position: playerPosition,
        appearance
      });
    }, 1000);
    
    return () => {
      playersSubscription.unsubscribe();
      clearInterval(updateInterval);
    };
  }, []);
  
  // Update player position in presence when it changes
  useEffect(() => {
    // This would update the player's position in the real-time presence system
  }, [playerPosition]);
  
  const handleLockControls = () => {
    setControlsEnabled(true);
    setShowUI(false);
  };
  
  const handleUnlockControls = () => {
    setControlsEnabled(false);
    setShowUI(true);
  };
  
  const handleJoinSession = (session) => {
    setControlsEnabled(false);
    onJoinSession(session);
  };
  
  return (
    <div className="relative w-full h-screen">
      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [0, 2, 10], fov: 60 }}>
        {/* Enhanced lighting */}
        <TavernLighting />
        
        {/* Environment */}
        <TavernEnvironment />
        <AtmosphericParticles />
        <Sky sunPosition={[100, 10, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
        
        {/* Current player */}
        {!controlsEnabled && (
          <PlayerCharacter 
            appearance={appearance} 
            position={playerPosition} 
            isCurrentPlayer={true} 
          />
        )}
        
        {/* Other players from presence */}
        {players.map((player, index) => (
          player.user_id !== (appearance.id || 'anonymous') && (
            <PlayerCharacter 
              key={player.user_id || index}
              appearance={player.appearance}
              position={player.position}
            />
          )
        ))}
        
        {/* Session tables */}
        {sessions.map((session, index) => {
          // Position sessions in a circle around the center
          const angle = (index / sessions.length) * Math.PI * 2;
          const radius = 15;
          const x = Math.sin(angle) * radius;
          const z = Math.cos(angle) * radius;
          
          return (
            <SessionTable 
              key={session.id}
              session={session}
              position={[x, -0.5, z]}
              onClick={() => handleJoinSession(session)}
            />
          );
        })}
        
        {/* Controls */}
        {controlsEnabled ? (
          <>
            <PointerLockControls 
              ref={controlsRef} 
              onUnlock={handleUnlockControls} 
            />
            <PlayerController 
              position={playerPosition} 
              setPosition={setPlayerPosition} 
            />
          </>
        ) : (
          <OrbitControls 
            enableZoom={true} 
            enablePan={false} 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2}
            minDistance={5}
            maxDistance={20}
          />
        )}
        
        {/* Visual effects */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} />
          <Vignette eskil={false} offset={0.1} darkness={0.2} />
        </EffectComposer>
      </Canvas>
      
      {/* UI Overlay */}
      {showUI && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Header */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-auto">
            <div className="flex flex-col space-y-2">
              <button
                onClick={onBackToHome}
                className="px-4 py-2 bg-gray-800/80 border border-amber-600 rounded-lg text-amber-300 hover:bg-gray-700/80 transition-colors"
              >
                Back to Tavern
              </button>
              
              {toggleLobbyMode && (
                <button
                  onClick={toggleLobbyMode}
                  className="px-4 py-2 bg-gray-800/80 border border-amber-600 rounded-lg text-amber-300 hover:bg-gray-700/80 transition-colors"
                >
                  Switch to 2D Lobby
                </button>
              )}
            </div>
            
            <h1 className="fantasy-title text-3xl font-bold text-amber-300 glow-text">
              Multiplayer Lobby
            </h1>
            
            <button
              onClick={onCreateSession}
              className="px-4 py-2 rune-button rounded-lg font-bold text-black"
            >
              Create Session
            </button>
          </div>
          
          {/* Character Info - Moved up above sessions */}
          {appearance && (
            <div className="absolute top-32 left-4 bg-amber-900/80 backdrop-blur-sm border border-amber-600/50 rounded-lg px-4 py-2 shadow-lg z-30 pointer-events-auto">
              <div className="text-amber-300 text-sm mb-2">
                Playing as: <span className="font-bold">{appearance.name || "Adventurer"}</span>
              </div>
              <div className="flex space-x-2">
                <button
                  className="text-amber-400 hover:text-amber-300 text-xs underline"
                >
                  Switch Character
                </button>
                <button
                  className="text-amber-400 hover:text-amber-300 text-xs underline"
                >
                  Create New
                </button>
              </div>
            </div>
          )}
          
          {/* Session List */}
          <div className="absolute bottom-24 left-4 right-4 bg-gray-900/80 backdrop-blur-sm border border-amber-600/30 rounded-lg p-4 pointer-events-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="fantasy-title text-xl text-amber-300">Available Sessions</h2>
              <button
                onClick={loadSessions}
                className="px-3 py-1 bg-amber-600/20 border border-amber-600 rounded-lg text-amber-300 hover:bg-amber-600/30 transition-colors text-sm"
              >
                Refresh
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-60 overflow-y-auto custom-scrollbar">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-gray-800/80 border border-amber-600/30 rounded-lg p-3 hover:bg-gray-700/80 hover:border-amber-500/50 transition-all cursor-pointer"
                    onClick={() => handleJoinSession(session)}
                  >
                    <h3 className="text-amber-300 font-medium">{session.name}</h3>
                    <p className="text-amber-200 text-sm truncate">{session.description}</p>
                    <div className="flex justify-between mt-2 text-xs text-amber-400">
                      <span>Players: {session.current_players}/{session.max_players}</span>
                      <span>{session.is_active ? 'Active' : 'Waiting'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-4 text-amber-400">
                  No active sessions found. Create one to start playing!
                </div>
              )}
            </div>
          </div>
          
          {/* First-person mode button */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
            <button
              onClick={handleLockControls}
              className="px-6 py-3 bg-amber-600/80 border-2 border-amber-500 rounded-lg text-black font-bold hover:bg-amber-500/80 transition-colors"
            >
              Enter First-Person Mode
            </button>
          </div>
          
          {/* Online players count */}
          <div className="absolute bottom-4 right-4 bg-gray-900/80 backdrop-blur-sm border border-amber-600/30 rounded-lg px-3 py-1">
            <span className="text-amber-300 text-sm">
              {players.length} {players.length === 1 ? 'Adventurer' : 'Adventurers'} Online
            </span>
          </div>
        </div>
      )}
      
      {/* Controls help (when in first-person mode) */}
      {controlsEnabled && (
        <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-sm border border-amber-600/30 rounded-lg p-3">
          <p className="text-amber-300 text-sm">
            <strong>Controls:</strong> WASD to move, Mouse to look, ESC to exit
          </p>
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