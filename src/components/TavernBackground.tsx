import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Sky, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// Floating particles for atmosphere
function FloatingParticles() {
  const particles = useRef<THREE.Group>(null);
  const particleCount = 200;
  const particlePositions = useRef<THREE.Vector3[]>([]);
  const particleSpeeds = useRef<number[]>([]);
  
  // Initialize particle positions and speeds
  React.useEffect(() => {
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
    if (particles.current) {
      // Animate particles
      particles.current.children.forEach((particle, i) => {
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
    <group ref={particles}>
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
      
      {/* Ember particles (near fireplace) - MADE SMALLER */}
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

// Tavern environment
function TavernEnvironment() {
  // Create simple textures for the environment
  const floorTexture = new THREE.TextureLoader().load('/textures/wood_floor.jpg');
  const wallTexture = new THREE.TextureLoader().load('/textures/stone_wall.jpg');
  const ceilingTexture = new THREE.TextureLoader().load('/textures/ceiling_texture.jpg'); // New ceiling texture
  const grassTexture = new THREE.TextureLoader().load('/textures/grass_texture.jpg'); // Texture for outside grass
  const tableTexture = new THREE.TextureLoader().load('/textures/table_texture.jpg'); // Texture for tables
  const tableCarpetTexture = new THREE.TextureLoader().load('/textures/table_carpet_texture.jpg'); // Texture for table carpet
  const barTexture = new THREE.TextureLoader().load('/textures/wood_floor.jpg'); // Reusing wood texture for bar
  const shelfTexture = new THREE.TextureLoader().load('/textures/wood_floor.jpg'); // Reusing wood texture for shelves
  
  // Fallback if textures don't load
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
  ceilingTexture.wrapS = ceilingTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
  tableTexture.wrapS = tableTexture.wrapT = THREE.RepeatWrapping;
  tableCarpetTexture.wrapS = tableCarpetTexture.wrapT = THREE.RepeatWrapping;
  barTexture.wrapS = barTexture.wrapT = THREE.RepeatWrapping;
  shelfTexture.wrapS = shelfTexture.wrapT = THREE.RepeatWrapping;
  
  floorTexture.repeat.set(10, 10);
  wallTexture.repeat.set(5, 2);
  ceilingTexture.repeat.set(8, 8);
  grassTexture.repeat.set(20, 20);
  tableTexture.repeat.set(1, 1);
  tableCarpetTexture.repeat.set(1, 1);
  barTexture.repeat.set(3, 1);
  shelfTexture.repeat.set(3, 1);
  
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial 
          map={floorTexture}
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
          <meshStandardMaterial 
            map={wallTexture}
          />
        </mesh>
      ))}
      
      {/* CEILING ADDED AT HEIGHT 7 - WITH DIFFERENT TEXTURE */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 7, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial 
          map={ceilingTexture}
        />
      </mesh>
      
      {/* Wooden Pillars - RELOCATED TO OPTIMAL TAVERN POSITIONS AND EXTENDED TO TOUCH CEILING */}
      <WoodenPillar position={[-12, 3.5, -12]} />
      <WoodenPillar position={[12, 3.5, -12]} />
      <WoodenPillar position={[-12, 3.5, 12]} />
      <WoodenPillar position={[12, 3.5, 12]} />
      <WoodenPillar position={[0, 3.5, -12]} />
      <WoodenPillar position={[0, 3.5, 12]} />
      
      {/* Bar counter pushed closer to the wall */}
      <group position={[-24, 0, 0]}>
        {/* Main bar counter with texture */}
        <mesh position={[0, 0, 0]} rotation={[0, Math.PI/2, 0]} castShadow receiveShadow>
          <boxGeometry args={[15, 1.2, 1.5]} />
          <meshStandardMaterial map={barTexture} />
        </mesh>
        
        {/* Bar front panel with texture */}
        <mesh position={[0, -0.6, 0.6]} rotation={[0, Math.PI/2, 0]} castShadow receiveShadow>
          <boxGeometry args={[15, 1, 0.1]} />
          <meshStandardMaterial map={barTexture} />
        </mesh>
        
        {/* Bar shelves pushed to the wall */}
        <mesh position={[0, 1.5, -0.75]} rotation={[0, Math.PI/2, 0]} castShadow receiveShadow>
          <boxGeometry args={[15, 0.1, 0.5]} />
          <meshStandardMaterial map={shelfTexture} />
        </mesh>
        
        <mesh position={[0, 2.5, -0.75]} rotation={[0, Math.PI/2, 0]} castShadow receiveShadow>
          <boxGeometry args={[15, 0.1, 0.5]} />
          <meshStandardMaterial map={shelfTexture} />
        </mesh>
      </group>
      
      {/* Barrels - Placed in clusters in corners and along walls */}
      <Barrel position={[-22, -0.25, -22]} />
      <Barrel position={[-20, -0.25, -22]} />
      <Barrel position={[-21, -0.25, -20]} />
      <Barrel position={[22, -0.25, -22]} />
      <Barrel position={[20, -0.25, -22]} />
      <Barrel position={[22, -0.25, 20]} />
      <Barrel position={[-22, -0.25, 20]} />
      <Barrel position={[-22, -0.25, 18]} />
      
      {/* Wall Torches */}
      <WallTorch position={[-24, 3, -10]} rotation={Math.PI / 2} />
      <WallTorch position={[-24, 3, 10]} rotation={Math.PI / 2} />
      <WallTorch position={[24, 3, -10]} rotation={-Math.PI / 2} />
      <WallTorch position={[24, 3, 10]} rotation={-Math.PI / 2} />
      <WallTorch position={[-10, 3, -24]} rotation={0} />
      <WallTorch position={[10, 3, -24]} rotation={0} />
      <WallTorch position={[-10, 3, 24]} rotation={Math.PI} />
      <WallTorch position={[10, 3, 24]} rotation={Math.PI} />
      
      {/* Windows with outside view - FIXED TO SHOW GRASS */}
      <TavernWindow position={[-24.5, 3, -15]} rotation={Math.PI / 2} />
      <TavernWindow position={[-24.5, 3, 15]} rotation={Math.PI / 2} />
      <TavernWindow position={[24.5, 3, -15]} rotation={-Math.PI / 2} />
      <TavernWindow position={[24.5, 3, 15]} rotation={-Math.PI / 2} />
      
      {/* Shields on walls */}
      <WallShield position={[-15, 3, -24.5]} rotation={0} />
      <WallShield position={[15, 3, -24.5]} rotation={0} />
      <WallShield position={[-15, 3, 24.5]} rotation={Math.PI} />
      <WallShield position={[15, 3, 24.5]} rotation={Math.PI} />
      
      {/* Crossed swords on walls */}
      <CrossedSwords position={[-20, 3, -24.5]} rotation={0} />
      <CrossedSwords position={[20, 3, -24.5]} rotation={0} />
      <CrossedSwords position={[-20, 3, 24.5]} rotation={Math.PI} />
      <CrossedSwords position={[20, 3, 24.5]} rotation={Math.PI} />
      
      {/* Chandeliers for additional light sources */}
      <Chandelier position={[0, 6, 0]} />
      <Chandelier position={[-10, 6, -10]} />
      <Chandelier position={[10, 6, -10]} />
      <Chandelier position={[-10, 6, 10]} />
      <Chandelier position={[10, 6, 10]} />
      
      {/* Tavern tables */}
      {[
        [-5, -5], [5, -5], [-5, 5], [5, 5], [0, 0], [-10, 0], [10, 0]
      ].map((pos, index) => (
        <group key={index} position={[pos[0], -0.5, pos[1]]}>
          {/* Table */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[1.2, 1, 0.2, 16]} />
            <meshStandardMaterial map={tableTexture} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, -0.6, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 1, 8]} />
            <meshStandardMaterial map={tableTexture} />
          </mesh>
          
          {/* Table cloth/carpet */}
          <mesh position={[0, 0.11, 0]} receiveShadow>
            <cylinderGeometry args={[1, 1, 0.02, 16]} />
            <meshStandardMaterial map={tableCarpetTexture} />
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
          
          {/* Chairs - 6 around each table */}
          {[0, Math.PI/3, 2*Math.PI/3, Math.PI, 4*Math.PI/3, 5*Math.PI/3].map((angle, i) => (
            <TavernChair 
              key={i} 
              position={[
                Math.sin(angle) * 2.2, 
                0, 
                Math.cos(angle) * 2.2
              ]}
              rotation={angle + Math.PI} // Chair faces the table
            />
          ))}
        </group>
      ))}
      
      <Fireplace />
    </group>
  );
}

// Wooden pillar component - EXTENDED TO TOUCH FLOOR
function WoodenPillar({ position }: { position: [number, number, number] }) {
  // Load pillar texture
  const pillarTexture = new THREE.TextureLoader().load('/textures/pillar_texture.jpg');
  const pillarCapTexture = new THREE.TextureLoader().load('/textures/pillar_cap_texture.jpg');
  
  return (
    <group position={position}>
      {/* Main pillar - EXTENDED HEIGHT to touch ceiling */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 8, 0.8]} /> {/* Full height pillar from floor to ceiling */}
        <meshStandardMaterial map={pillarTexture} />
      </mesh>
      
      {/* Base - positioned at floor level */}
      <mesh position={[0, -3.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.2, 1.2]} />
        <meshStandardMaterial map={pillarCapTexture} />
      </mesh>
      
      {/* Top - positioned at ceiling level */}
      <mesh position={[0, 3.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.2, 1.2]} />
        <meshStandardMaterial map={pillarCapTexture} />
      </mesh>
    </group>
  );
}

// Barrel component
function Barrel({ position }: { position: [number, number, number] }) {
  // Load barrel texture
  const barrelTexture = new THREE.TextureLoader().load('/textures/barrel_texture.jpg');
  const barrelRingTexture = new THREE.TextureLoader().load('/textures/barrel_ring_texture.jpg');
  
  return (
    <group position={position}>
      {/* Main barrel */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.7, 1.5, 16]} />
        <meshStandardMaterial map={barrelTexture} />
      </mesh>
      
      {/* Rings */}
      {[-0.6, -0.2, 0.2, 0.6].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow receiveShadow>
          <torusGeometry args={[0.71, 0.05, 8, 24]} />
          <meshStandardMaterial map={barrelRingTexture} />
        </mesh>
      ))}
    </group>
  );
}

// Wall Torch component with light source
function WallTorch({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const flameRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  
  // Load torch texture
  const torchHandleTexture = new THREE.TextureLoader().load('/textures/torch_handle_texture.jpg');
  const torchBowlTexture = new THREE.TextureLoader().load('/textures/torch_bowl_texture.jpg');
  const fireTexture = new THREE.TextureLoader().load('/textures/fire_texture.jpg');
  
  useFrame(({ clock }) => {
    if (flameRef.current) {
      // Animate flame
      flameRef.current.scale.x = 1 + Math.sin(clock.getElapsedTime() * 10) * 0.1;
      flameRef.current.scale.z = 1 + Math.cos(clock.getElapsedTime() * 8) * 0.1;
    }
    
    if (lightRef.current) {
      // Animate light intensity
      lightRef.current.intensity = 1.5 + Math.sin(clock.getElapsedTime() * 5) * 0.3;
    }
  });
  
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Torch handle */}
      <mesh castShadow position={[0, 0, 0.3]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
        <meshStandardMaterial map={torchHandleTexture} />
      </mesh>
      
      {/* Torch bowl */}
      <mesh castShadow position={[0, 0, 0.6]}>
        <cylinderGeometry args={[0.15, 0.1, 0.1, 8]} />
        <meshStandardMaterial map={torchBowlTexture} />
      </mesh>
      
      {/* Flame with texture */}
      <mesh ref={flameRef} position={[0, 0, 0.7]}>
        <planeGeometry args={[0.3, 0.4]} />
        <meshBasicMaterial map={fireTexture} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Light source */}
      <pointLight 
        ref={lightRef}
        position={[0, 0, 0.8]} 
        intensity={1.5} 
        color="#FF7F00" 
        distance={8} 
        decay={2} 
      />
    </group>
  );
}

// Wall Shield component
function WallShield({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  // Load shield texture
  const shieldTexture = new THREE.TextureLoader().load('/textures/shield_texture.jpg');
  const shieldEmblemTexture = new THREE.TextureLoader().load('/textures/shield_emblem_texture.jpg');
  
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Shield base */}
      <mesh castShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.8, 0.6, 0.1, 32, 1, false, 0, Math.PI]} rotation={[Math.PI/2, 0, 0]} />
        <meshStandardMaterial map={shieldTexture} />
      </mesh>
      
      {/* Shield emblem */}
      <mesh position={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.5, 0.5, 0.02, 32, 1, false, 0, Math.PI]} rotation={[Math.PI/2, 0, 0]} />
        <meshStandardMaterial map={shieldEmblemTexture} />
      </mesh>
    </group>
  );
}

// Crossed Swords component
function CrossedSwords({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  // Load sword textures
  const swordBladeTexture = new THREE.TextureLoader().load('/textures/sword_blade_texture.jpg');
  const swordHiltTexture = new THREE.TextureLoader().load('/textures/sword_hilt_texture.jpg');
  
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* First sword */}
      <group rotation={[0, 0, Math.PI/4]}>
        <mesh castShadow>
          <boxGeometry args={[0.1, 2, 0.05]} />
          <meshStandardMaterial map={swordBladeTexture} />
        </mesh>
        <mesh position={[0, -1.2, 0]} castShadow>
          <boxGeometry args={[0.2, 0.4, 0.1]} />
          <meshStandardMaterial map={swordHiltTexture} />
        </mesh>
      </group>
      
      {/* Second sword */}
      <group rotation={[0, 0, -Math.PI/4]}>
        <mesh castShadow>
          <boxGeometry args={[0.1, 2, 0.05]} />
          <meshStandardMaterial map={swordBladeTexture} />
        </mesh>
        <mesh position={[0, -1.2, 0]} castShadow>
          <boxGeometry args={[0.2, 0.4, 0.1]} />
          <meshStandardMaterial map={swordHiltTexture} />
        </mesh>
      </group>
    </group>
  );
}

// Window component with outside view - FIXED TO SHOW GRASS TEXTURE
function TavernWindow({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  // Load window textures
  const windowFrameTexture = new THREE.TextureLoader().load('/textures/window_frame_texture.jpg');
  const windowGlassTexture = new THREE.TextureLoader().load('/textures/window_glass_texture.jpg');
  const grassTexture = new THREE.TextureLoader().load('/textures/grass_texture.jpg');
  
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Window frame */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[2, 3, 0.2]} />
        <meshStandardMaterial map={windowFrameTexture} />
      </mesh>
      
      {/* Window opening - REMOVED BLACK COLOR */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.6, 2.6, 0.3]} />
        <meshBasicMaterial transparent opacity={0} /> {/* Made transparent instead of black */}
      </mesh>
      
      {/* Outside view (grass) - MOVED FORWARD */}
      <mesh position={[0, 0, -0.2]}>
        <planeGeometry args={[1.5, 2.5]} />
        <meshStandardMaterial map={grassTexture} />
      </mesh>
      
      {/* Window glass */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[1.5, 2.5]} />
        <meshStandardMaterial map={windowGlassTexture} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Window dividers */}
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[0.1, 2.5, 0.1]} />
        <meshStandardMaterial map={windowFrameTexture} />
      </mesh>
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[1.5, 0.1, 0.1]} />
        <meshStandardMaterial map={windowFrameTexture} />
      </mesh>
    </group>
  );
}

// Chair component
function TavernChair({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  // Load chair texture
  const chairTexture = new THREE.TextureLoader().load('/textures/chair_texture.jpg');
  
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat */}
      <mesh castShadow position={[0, -0.3, 0]}>
        <boxGeometry args={[0.5, 0.05, 0.5]} />
        <meshStandardMaterial map={chairTexture} />
      </mesh>
      
      {/* Legs */}
      <mesh castShadow position={[0, -0.7, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
        <meshStandardMaterial map={chairTexture} />
      </mesh>
      
      {/* Back */}
      <mesh castShadow position={[0, 0, -0.25]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.05]} />
        <meshStandardMaterial map={chairTexture} />
      </mesh>
    </group>
  );
}

// Chandelier component
function Chandelier({ position }: { position: [number, number, number] }) {
  const flameRefs = useRef<THREE.Mesh[]>([]);
  const lightRefs = useRef<THREE.PointLight[]>([]);
  
  // Load chandelier textures
  const chandelierMetalTexture = new THREE.TextureLoader().load('/textures/chandelier_metal_texture.jpg');
  const fireTexture = new THREE.TextureLoader().load('/textures/fire_texture.jpg');
  
  useFrame(({ clock }) => {
    // Animate flames and lights
    flameRefs.current.forEach((flame, i) => {
      if (flame) {
        flame.scale.x = 1 + Math.sin(clock.getElapsedTime() * 10 + i) * 0.1;
        flame.scale.z = 1 + Math.cos(clock.getElapsedTime() * 8 + i) * 0.1;
      }
    });
    
    lightRefs.current.forEach((light, i) => {
      if (light) {
        light.intensity = 1 + Math.sin(clock.getElapsedTime() * 5 + i) * 0.2;
      }
    });
  });
  
  // Create refs for flames and lights
  React.useEffect(() => {
    flameRefs.current = flameRefs.current.slice(0, 6);
    lightRefs.current = lightRefs.current.slice(0, 6);
  }, []);
  
  return (
    <group position={position}>
      {/* Central ring */}
      <mesh castShadow>
        <torusGeometry args={[1, 0.1, 16, 32]} />
        <meshStandardMaterial map={chandelierMetalTexture} />
      </mesh>
      
      {/* Hanging chain */}
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 6, 8]} />
        <meshStandardMaterial map={chandelierMetalTexture} />
      </mesh>
      
      {/* Candles and flames */}
      {[0, Math.PI/3, 2*Math.PI/3, Math.PI, 4*Math.PI/3, 5*Math.PI/3].map((angle, i) => (
        <group key={i} position={[Math.sin(angle) * 1, 0, Math.cos(angle) * 1]}>
          {/* Candle */}
          <mesh castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
            <meshStandardMaterial color="#F5F5DC" />
          </mesh>
          
          {/* Flame with texture */}
          <mesh 
            position={[0, 0.3, 0]} 
            ref={el => {
              if (el) flameRefs.current[i] = el;
            }}
          >
            <planeGeometry args={[0.2, 0.3]} />
            <meshBasicMaterial map={fireTexture} transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
          
          {/* Light */}
          <pointLight 
            position={[0, 0.3, 0]} 
            intensity={1} 
            color="#FF7F00" 
            distance={5} 
            decay={2}
            ref={el => {
              if (el) lightRefs.current[i] = el;
            }}
          />
        </group>
      ))}
    </group>
  );
}

// Enhanced fireplace with animated flames
function Fireplace() {
  const fireRef = useRef<THREE.PointLight>(null);
  
  // Load fireplace texture
  const fireplaceTexture = new THREE.TextureLoader().load('/textures/fireplace_texture.jpg');
  const fireTexture = new THREE.TextureLoader().load('/textures/fire_texture.jpg');
  
  useFrame(({ clock }) => {
    if (fireRef.current) {
      // Simulate flickering fire
      const flicker = Math.sin(clock.getElapsedTime() * 10) * 0.2 + 0.8;
      fireRef.current.intensity = 2 * flicker;
    }
  });
  
  return (
    <group position={[0, 0, -23.5]}>
      {/* Fireplace structure - MADE TALLER */}
      <mesh position={[0, 0.5, -0.5]} castShadow receiveShadow>
        <boxGeometry args={[5, 3, 1]} /> {/* Increased height from 2 to 3 */}
        <meshStandardMaterial map={fireplaceTexture} />
      </mesh>
      
      {/* Fire opening - ADJUSTED POSITION */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1.5, 0.2]} /> {/* Increased height from 1 to 1.5 */}
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      {/* Fire grate (new) */}
      <group position={[0, -0.2, 0]}>
        {/* Horizontal bars */}
        {[-0.4, -0.2, 0, 0.2, 0.4].map((y, i) => (
          <mesh key={`grate-h-${i}`} position={[0, y, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[1.8, 0.03, 0.03]} />
            <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
        
        {/* Vertical bars */}
        {[-0.8, -0.4, 0, 0.4, 0.8].map((x, i) => (
          <mesh key={`grate-v-${i}`} position={[x, 0, 0]} rotation={[0, 0, Math.PI/2]}>
            <boxGeometry args={[1, 0.03, 0.03]} />
            <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
      </group>
      
      {/* Fire with texture */}
      <mesh position={[0, 0.5, 0]}>
        <planeGeometry args={[1.5, 1.5]} /> {/* Increased height to match taller fireplace */}
        <meshBasicMaterial map={fireTexture} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Light source for the fire */}
      <pointLight 
        ref={fireRef}
        position={[0, 0.5, 0]} 
        intensity={2} 
        color="#ff7b00" 
        distance={10} 
        decay={2} 
      />
      
      {/* Crossed swords above fireplace */}
      <group position={[0, 2.5, -0.7]}>
        <mesh rotation={[0, 0, Math.PI/4]} castShadow>
          <boxGeometry args={[0.1, 2, 0.1]} />
          <meshStandardMaterial color="#C0C0C0" />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI/4]} castShadow>
          <boxGeometry args={[0.1, 2, 0.1]} />
          <meshStandardMaterial color="#C0C0C0" />
        </mesh>
        {/* Sword handles */}
        <mesh position={[0.7, 0.7, 0]} rotation={[0, 0, Math.PI/4]} castShadow>
          <boxGeometry args={[0.15, 0.5, 0.15]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        <mesh position={[-0.7, 0.7, 0]} rotation={[0, 0, -Math.PI/4]} castShadow>
          <boxGeometry args={[0.15, 0.5, 0.15]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      </group>
      
      {/* Shield above fireplace */}
      <mesh position={[0, 3.5, -0.7]} castShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.1, 32, 1, false, 0, Math.PI]} rotation={[Math.PI/2, 0, 0]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      <mesh position={[0, 3.5, -0.65]} castShadow>
        <cylinderGeometry args={[0.7, 0.7, 0.1, 32, 1, false, 0, Math.PI]} rotation={[Math.PI/2, 0, 0]} />
        <meshStandardMaterial color="#C0C0C0" />
      </mesh>
    </group>
  );
}

// Custom fog component
function TavernFog() {
  return (
    <fog attach="fog" args={['#211b14', 15, 40]} /> // Increased density by reducing near and far values
  );
}

// Main tavern background component
export function TavernBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-black">
      <Canvas shadows camera={{ position: [0, 5, 15], fov: 60 }}>
        {/* Add volumetric fog */}
        <TavernFog />
        
        {/* Lighting - DIMMED for more tavern-like atmosphere */}
        <ambientLight intensity={0.1} color="#a88e68" /> {/* Reduced from 0.15 to 0.1 for dimmer atmosphere */}
        <directionalLight position={[5, 5, 5]} intensity={0.4} castShadow shadow-mapSize={2048} /> {/* Reduced from 0.6 to 0.4 */}
        <pointLight position={[0, 3, 0]} intensity={0.2} color="#ff9000" /> {/* Reduced from 0.3 to 0.2 */}
        
        {/* Environment */}
        <TavernEnvironment />
        <FloatingParticles />
        <Sky sunPosition={[100, 10, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
        
        {/* Controls */}
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          minPolarAngle={Math.PI / 3} 
          maxPolarAngle={Math.PI / 2}
          rotateSpeed={0.3}
          autoRotate
          autoRotateSpeed={0.5}
        />
        
        {/* Visual effects - ENHANCED for more atmosphere */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
          <Vignette eskil={false} offset={0.5} darkness={0.6} /> {/* Increased vignette effect for darker edges */}
        </EffectComposer>
      </Canvas>
    </div>
  );
}