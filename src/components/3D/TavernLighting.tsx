import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Tavern lighting component that can be shared between different scenes
export function TavernLighting() {
  // Main fireplace light
  const fireRef = useRef<THREE.PointLight>(null);
  const candlesRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (fireRef.current) {
      // Simulate flickering fire
      const flicker = Math.sin(clock.getElapsedTime() * 10) * 0.2 + 0.8;
      fireRef.current.intensity = 2 * flicker;
    }
    
    // Animate candle lights
    if (candlesRef.current) {
      candlesRef.current.children.forEach((light, i) => {
        if (light instanceof THREE.PointLight) {
          const candleFlicker = Math.sin(clock.getElapsedTime() * 5 + i * 2) * 0.1 + 0.9;
          light.intensity = 0.6 * candleFlicker;
        }
      });
    }
  });
  
  return (
    <>
      {/* Ambient light for base illumination */}
      <ambientLight intensity={0.3} color="#a88e68" />
      
      {/* Directional light simulating moonlight through windows */}
      <directionalLight 
        position={[5, 8, -10]} 
        intensity={0.8} 
        color="#8ca9d6" 
        castShadow 
        shadow-mapSize={2048}
      />
      
      {/* Fireplace light */}
      <pointLight 
        ref={fireRef}
        position={[0, 2, -23]} 
        intensity={2} 
        color="#ff7b00" 
        distance={30}
        decay={2}
        castShadow
      />
      
      {/* Bar area light */}
      <pointLight 
        position={[-19, 2, 0]} 
        intensity={1.2} 
        color="#ffc773" 
        distance={15}
        decay={2}
      />
      
      {/* Table candle lights */}
      <group ref={candlesRef}>
        {[
          [-5, 0.5, -5], [5, 0.5, -5], [-5, 0.5, 5], [5, 0.5, 5], [0, 0.5, 0], [-10, 0.5, 0], [10, 0.5, 0]
        ].map((pos, idx) => (
          <pointLight 
            key={`candle-${idx}`}
            position={pos} 
            intensity={0.6} 
            color="#ffc773" 
            distance={5}
            decay={2}
          />
        ))}
      </group>
      
      {/* Window light shafts */}
      <spotLight
        position={[-24, 3, 0]}
        angle={0.3}
        penumbra={0.8}
        intensity={0.5}
        color="#8ca9d6"
        distance={20}
        decay={2}
        castShadow
      />
      
      <spotLight
        position={[24, 3, 0]}
        angle={0.3}
        penumbra={0.8}
        intensity={0.5}
        color="#8ca9d6"
        distance={20}
        decay={2}
        castShadow
      />
    </>
  );
}