import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Atmospheric particles for dust, embers, etc.
export function AtmosphericParticles() {
  const particlesRef = useRef<THREE.Group>(null);
  const particleCount = 200;
  const particlePositions = useRef<THREE.Vector3[]>([]);
  const particleSpeeds = useRef<number[]>([]);
  
  // Initialize particle positions and speeds
  useEffect(() => {
    particlePositions.current = Array.from({ length: particleCount }, () => 
      new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        Math.random() * 4,
        (Math.random() - 0.5) * 40
      )
    );
    
    particleSpeeds.current = Array.from({ length: particleCount }, () => 
      Math.random() * 0.02 + 0.01
    );
  }, []);
  
  useFrame(({ clock }) => {
    if (particlesRef.current) {
      // Animate particles
      particlesRef.current.children.forEach((particle, i) => {
        // Slow upward movement
        particle.position.y += particleSpeeds.current[i];
        
        // Slight random horizontal movement
        particle.position.x += Math.sin(clock.getElapsedTime() * 0.5 + i) * 0.01;
        particle.position.z += Math.cos(clock.getElapsedTime() * 0.5 + i) * 0.01;
        
        // Reset position when particle reaches the ceiling
        if (particle.position.y > 4) {
          particle.position.y = 0;
          particle.position.x = (Math.random() - 0.5) * 40;
          particle.position.z = (Math.random() - 0.5) * 40;
        }
      });
    }
  });
  
  return (
    <group ref={particlesRef}>
      {/* Dust particles */}
      {Array.from({ length: particleCount * 0.7 }).map((_, i) => (
        <mesh 
          key={`dust-${i}`}
          position={[
            (Math.random() - 0.5) * 40,
            Math.random() * 4,
            (Math.random() - 0.5) * 40
          ]}
        >
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color="#d9c8a9" transparent opacity={0.3} />
        </mesh>
      ))}
      
      {/* Ember particles (near fireplace) */}
      {Array.from({ length: particleCount * 0.3 }).map((_, i) => (
        <mesh 
          key={`ember-${i}`}
          position={[
            (Math.random() - 0.5) * 4,
            Math.random() * 3,
            -23 + (Math.random() - 0.5) * 2
          ]}
        >
          <sphereGeometry args={[0.015, 8, 8]} /> {/* Reduced size from 0.05 to 0.015 */}
          <meshBasicMaterial color={Math.random() > 0.5 ? "#ff7b00" : "#ff4500"} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}