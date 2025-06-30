import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useCharacterStore } from '../../stores/characterStore';

// Character model component
function CharacterModel({ characterModel = 'a', rotate = true }) {
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
    if (rotate && group.current) {
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

// Character 3D Viewer Component
export function Character3DViewer({ className = '', rotate = true }) {
  const { appearance } = useCharacterStore();
  
  return (
    <div className={`w-full h-full min-h-[300px] ${className}`}>
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <CharacterModel characterModel={appearance.characterModel} rotate={rotate} />
        <OrbitControls enableZoom={true} enablePan={false} minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
        <ContactShadows opacity={0.5} scale={10} blur={1} far={10} resolution={256} color="#000000" />
        <Environment preset="sunset" />
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} />
        </EffectComposer>
      </Canvas>
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