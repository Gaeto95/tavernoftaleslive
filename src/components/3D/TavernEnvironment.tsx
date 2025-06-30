import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EnhancedFireplace } from './EnhancedFireplace';

// Tavern environment component that can be shared between different scenes
export function TavernEnvironment() {
  // Create simple textures for the environment - using useMemo to prevent re-creation on each render
  const textures = useMemo(() => {
    const floorTexture = new THREE.TextureLoader().load('/textures/wood_floor.jpg');
    const wallTexture = new THREE.TextureLoader().load('/textures/stone_wall.jpg');
    const ceilingTexture = new THREE.TextureLoader().load('/textures/ceiling_texture.jpg');
    
    // Set texture properties
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    ceilingTexture.wrapS = ceilingTexture.wrapT = THREE.RepeatWrapping;
    
    floorTexture.repeat.set(10, 10);
    wallTexture.repeat.set(5, 2);
    ceilingTexture.repeat.set(8, 8);
    
    return { floorTexture, wallTexture, ceilingTexture };
  }, []);
  
  // Fireplace flame animation
  const flameRef = useRef<THREE.Mesh>(null);
  const fireRef = useRef<THREE.PointLight>(null);
  
  useFrame(({ clock }) => {
    // Animate flame
    if (flameRef.current) {
      flameRef.current.scale.y = 1 + Math.sin(clock.getElapsedTime() * 5) * 0.2;
      flameRef.current.rotation.y += 0.05;
    }
    
    // Animate fire light
    if (fireRef.current) {
      fireRef.current.intensity = 2 + Math.sin(clock.getElapsedTime() * 10) * 0.5;
    }
  });
  
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial 
          color="#8B4513" 
          map={textures.floorTexture}
        />
      </mesh>
      
      {/* Walls - INCREASED HEIGHT TO 7 - WALLS TOUCH FLOOR AND CEILING */}
      {[
        { position: [0, 3, -25], rotation: [0, 0, 0], size: [50, 8, 1] },
        { position: [0, 3, 25], rotation: [0, 0, 0], size: [50, 8, 1] },
        { position: [-25, 3, 0], rotation: [0, Math.PI / 2, 0], size: [50, 8, 1] },
        { position: [25, 3, 0], rotation: [0, Math.PI / 2, 0], size: [50, 8, 1] }
      ].map((wall, index) => (
        <mesh key={index} position={wall.position} rotation={wall.rotation} receiveShadow castShadow>
          <boxGeometry args={wall.size} />
          <meshBasicMaterial 
            color="#A0522D" 
            map={textures.wallTexture}
          />
        </mesh>
      ))}
      
      {/* CEILING ADDED AT HEIGHT 7 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 7, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial 
          color="#5D4037" 
          map={textures.ceilingTexture}
        />
      </mesh>
      
      {/* Tavern tables */}
      {[
        [-5, -5], [5, -5], [-5, 5], [5, 5], [0, 0], [-10, 0], [10, 0]
      ].map((pos, index) => (
        <group key={index} position={[pos[0], -0.5, pos[1]]}>
          {/* Table */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[1.2, 1, 0.2, 16]} />
            <meshBasicMaterial color="#8B4513" />
          </mesh>
          <mesh castShadow receiveShadow position={[0, -0.6, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 1, 8]} />
            <meshBasicMaterial color="#8B4513" />
          </mesh>
          
          {/* Table cloth */}
          <mesh position={[0, 0.11, 0]} receiveShadow>
            <cylinderGeometry args={[1, 1, 0.02, 16]} />
            <meshBasicMaterial color="#5c4033" />
          </mesh>
          
          {/* Candle on table */}
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.2, 8]} />
            <meshBasicMaterial color="#F5F5DC" />
          </mesh>
          
          {/* Candle flame */}
          <mesh position={[0, 0.35, 0]}>
            <coneGeometry args={[0.03, 0.1, 8]} />
            <meshBasicMaterial color="#FFA500" />
            <pointLight intensity={0.5} distance={3} decay={2} color="#FFA500" />
          </mesh>
          
          {/* Chairs */}
          {[0, Math.PI/2, Math.PI, Math.PI*1.5].map((rotation, i) => (
            <group key={i} rotation={[0, rotation, 0]} position={[0, 0, 2]}>
              <mesh castShadow receiveShadow position={[0, -0.3, 0]}>
                <cylinderGeometry args={[0.4, 0.4, 0.1, 12]} />
                <meshBasicMaterial color="#A0522D" />
              </mesh>
              <mesh castShadow receiveShadow position={[0, -0.7, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
                <meshBasicMaterial color="#A0522D" />
              </mesh>
              
              {/* Chair back */}
              <mesh castShadow receiveShadow position={[0, 0, -0.4]} rotation={[Math.PI/10, 0, 0]}>
                <boxGeometry args={[0.8, 0.6, 0.05]} />
                <meshBasicMaterial color="#A0522D" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      
      {/* Bar counter */}
      <mesh castShadow receiveShadow position={[-20, 0, 0]} rotation={[0, Math.PI/2, 0]}>
        <boxGeometry args={[10, 1, 1]} />
        <meshBasicMaterial color="#8B4513" />
      </mesh>
      
      {/* Bottles on the bar */}
      {Array.from({ length: 5 }).map((_, i) => (
        <group key={`bottle-${i}`} position={[-20, 1, -4 + i * 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.5, 8]} />
            <meshBasicMaterial 
              color={['#5f9ea0', '#8a2be2', '#ff7f50', '#6495ed', '#7fff00'][i]} 
              transparent 
              opacity={0.8}
            />
          </mesh>
        </group>
      ))}
      
      {/* Fireplace */}
      <EnhancedFireplace />
      
      {/* Wall decorations */}
      {/* Shields */}
      <mesh position={[-15, 2, -24.5]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.5, 2, 0.2]} />
        <meshBasicMaterial color="#CD7F32" />
      </mesh>
      
      <mesh position={[15, 2, -24.5]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.5, 2, 0.2]} />
        <meshBasicMaterial color="#C0C0C0" />
      </mesh>
      
      {/* Crossed swords */}
      <group position={[0, 2.5, -24.5]} rotation={[0, 0, Math.PI/4]}>
        <mesh castShadow>
          <boxGeometry args={[0.1, 2, 0.1]} />
          <meshBasicMaterial color="#C0C0C0" />
        </mesh>
      </group>
      <group position={[0, 2.5, -24.5]} rotation={[0, 0, -Math.PI/4]}>
        <mesh castShadow>
          <boxGeometry args={[0.1, 2, 0.1]} />
          <meshBasicMaterial color="#C0C0C0" />
        </mesh>
      </group>
      
      {/* Atmospheric lighting */}
      <ambientLight intensity={0.3} color="#a88e68" />
      <directionalLight position={[5, 8, -10]} intensity={0.8} color="#8ca9d6" castShadow />
      <pointLight position={[0, 2, -23]} intensity={2} color="#ff7b00" distance={30} decay={2} castShadow />
      <pointLight position={[-19, 2, 0]} intensity={1.2} color="#ffc773" distance={15} decay={2} />
    </group>
  );
}