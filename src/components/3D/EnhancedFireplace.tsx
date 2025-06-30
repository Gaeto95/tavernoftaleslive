import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Enhanced fireplace with animated flames
export function EnhancedFireplace() {
  const flamesRef = useRef<THREE.Group>(null);
  const fireRef = useRef<THREE.PointLight>(null);
  
  useFrame(({ clock }) => {
    if (flamesRef.current) {
      flamesRef.current.children.forEach((flame, i) => {
        // Animate flame height
        const scale = 1 + Math.sin(clock.getElapsedTime() * 5 + i * 2) * 0.2;
        flame.scale.y = scale;
        
        // Animate flame rotation
        flame.rotation.y = Math.sin(clock.getElapsedTime() * 2 + i) * 0.2;
      });
    }
    
    if (fireRef.current) {
      // Simulate flickering fire
      const flicker = Math.sin(clock.getElapsedTime() * 10) * 0.2 + 0.8;
      fireRef.current.intensity = 2 * flicker;
    }
  });
  
  return (
    <group position={[0, 0, -23.5]}>
      {/* Fireplace structure */}
      <mesh position={[0, 0, -0.5]} castShadow receiveShadow>
        <boxGeometry args={[5, 2, 1]} />
        <meshStandardMaterial color="#A0522D" roughness={0.8} />
      </mesh>
      
      {/* Fire opening */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 1, 0.2]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      
      {/* Logs */}
      <mesh position={[0, -0.4, 0]} rotation={[0, Math.PI/4, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 2, 8]} />
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </mesh>
      <mesh position={[0.3, -0.2, 0]} rotation={[0, -Math.PI/4, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 1.8, 8]} />
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </mesh>
      
      {/* Animated flames */}
      <group ref={flamesRef}>
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh 
            key={`flame-${i}`}
            position={[(Math.random() - 0.5) * 1.5, 0.2, (Math.random() - 0.5) * 0.5]}
            rotation={[0, Math.random() * Math.PI, 0]}
          >
            <coneGeometry args={[0.2, 1, 8]} />
            <meshBasicMaterial color={i % 2 === 0 ? "#ff7b00" : "#ff4500"} transparent opacity={0.8} />
          </mesh>
        ))}
      </group>
      
      {/* Ember particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh 
          key={`ember-${i}`}
          position={[
            (Math.random() - 0.5) * 1.5,
            Math.random() * 1.5,
            (Math.random() - 0.5) * 0.5
          ]}
        >
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color="#ff7b00" transparent opacity={0.7} />
        </mesh>
      ))}
      
      {/* Light source for the fire */}
      <pointLight 
        ref={fireRef}
        position={[0, 0.5, 0]} 
        intensity={2} 
        color="#ff7b00" 
        distance={10} 
        decay={2} 
      />
    </group>
  );
}