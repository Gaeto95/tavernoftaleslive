import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface SessionTableProps {
  session: any;
  position: [number, number, number];
  onClick: () => void;
}

// Enhanced session table with holographic preview
export function SessionTable({ session, position, onClick }: SessionTableProps) {
  const [hovered, setHovered] = useState(false);
  const tableRef = useRef<THREE.Group>(null);
  const hologramRef = useRef<THREE.Group>(null);
  const candleRef = useRef<THREE.PointLight>(null);
  
  // Animate the table on hover
  useFrame(({ clock }) => {
    if (tableRef.current) {
      if (hovered) {
        // Gentle floating animation when hovered
        tableRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.05;
      } else {
        // Reset position when not hovered
        tableRef.current.position.y = position[1];
      }
    }
    
    // Rotate the hologram
    if (hologramRef.current) {
      hologramRef.current.rotation.y += 0.01;
    }
    
    // Animate candle light
    if (candleRef.current) {
      const flicker = Math.sin(clock.getElapsedTime() * 5) * 0.2 + 0.8;
      candleRef.current.intensity = 0.5 * flicker;
    }
  });
  
  return (
    <group 
      ref={tableRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Table */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[1.2, 1, 0.2, 16]} />
        <meshStandardMaterial color={hovered ? "#DAA520" : "#8B4513"} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 1, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Table cloth */}
      <mesh position={[0, 0.11, 0]} receiveShadow>
        <cylinderGeometry args={[1.1, 1.1, 0.02, 16]} />
        <meshStandardMaterial 
          color={hovered ? "#DAA520" : "#5c4033"} 
          roughness={0.9}
        />
      </mesh>
      
      {/* Holographic session preview */}
      <group ref={hologramRef} position={[0, 1, 0]}>
        {/* Hologram base */}
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.05, 16]} />
          <meshStandardMaterial 
            color={hovered ? "#DAA520" : "#4a6670"} 
            emissive={hovered ? "#DAA520" : "#4a6670"}
            emissiveIntensity={0.5}
            transparent
            opacity={0.7}
          />
        </mesh>
        
        {/* Holographic beam */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.1, 0.5, 2, 16, 1, true]} />
          <meshBasicMaterial 
            color={hovered ? "#ffd700" : "#4a9fd9"} 
            transparent 
            opacity={0.3} 
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Holographic content - simple representation of players */}
        {Array.from({ length: Math.min(session.current_players, 4) }).map((_, i) => {
          const angle = (i / 4) * Math.PI * 2;
          const radius = 0.3;
          return (
            <mesh 
              key={`holo-player-${i}`}
              position={[
                Math.sin(angle) * radius,
                0.5,
                Math.cos(angle) * radius
              ]}
            >
              <boxGeometry args={[0.1, 0.3, 0.1]} />
              <meshBasicMaterial 
                color={hovered ? "#ffd700" : "#4a9fd9"} 
                transparent 
                opacity={0.7}
              />
            </mesh>
          );
        })}
      </group>
      
      {/* Session info floating above */}
      <group position={[0, 1.5, 0]}>
        <Text
          position={[0, 0.5, 0]}
          fontSize={0.3}
          color="#fbbf24"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {session.name}
        </Text>
        <Text
          position={[0, 0, 0]}
          fontSize={0.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {`Players: ${session.current_players}/${session.max_players}`}
        </Text>
        <Text
          position={[0, -0.3, 0]}
          fontSize={0.15}
          color={hovered ? "#fbbf24" : "#cccccc"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {hovered ? "Click to join" : session.description.substring(0, 20) + (session.description.length > 20 ? "..." : "")}
        </Text>
      </group>
      
      {/* Players around the table */}
      {Array.from({ length: session.current_players }).map((_, i) => {
        const angle = (i / session.current_players) * Math.PI * 2;
        return (
          <mesh 
            key={i} 
            position={[Math.sin(angle) * 2, -0.5, Math.cos(angle) * 2]}
            castShadow
          >
            <boxGeometry args={[0.6, 1.8, 0.6]} />
            <meshStandardMaterial color="#666666" />
          </mesh>
        );
      })}
      
      {/* Table status indicator */}
      <mesh 
        position={[0, -0.9, 0]}
        rotation={[-Math.PI/2, 0, 0]}
      >
        <ringGeometry args={[1.3, 1.5, 32]} />
        <meshBasicMaterial 
          color={
            session.current_players >= session.max_players ? "#ff4d4d" :  // Full
            session.current_players > 0 ? "#4dff4d" :                    // Has players
            "#4d4dff"                                                    // Empty
          } 
          transparent 
          opacity={0.7} 
        />
      </mesh>
      
      {/* Candle on table */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.2, 8]} />
        <meshStandardMaterial color="#F5F5DC" roughness={0.5} />
      </mesh>
      
      {/* Candle flame */}
      <mesh position={[0, 0.35, 0]}>
        <coneGeometry args={[0.03, 0.1, 8]} />
        <meshBasicMaterial color="#FFA500" />
        <pointLight 
          ref={candleRef}
          intensity={0.5} 
          distance={3} 
          decay={2} 
          color="#FFA500" 
        />
      </mesh>
    </group>
  );
}