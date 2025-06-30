import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface CharacterModelViewerProps {
  modelIndex: number;
  scale?: number;
}

export const CharacterModelViewer = forwardRef(({ modelIndex, scale = 1 }: CharacterModelViewerProps, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationMixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const frameIdRef = useRef<number | null>(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    updateModel: (index: number) => {
      loadModel(index);
    }
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black background
    sceneRef.current = scene;

    // Initialize camera
    const camera = new THREE.PerspectiveCamera(
      45, 
      containerRef.current.clientWidth / containerRef.current.clientHeight, 
      0.1, 
      1000
    );
    camera.position.set(0, 1, 3);
    cameraRef.current = camera;

    // Initialize renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffa500, 1, 10); // Amber colored light
    pointLight.position.set(0, 2, 2);
    scene.add(pointLight);

    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 2;
    controls.maxDistance = 5;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // Load model
    loadModel(modelIndex);

    // Animation loop
    const animate = () => {
      if (animationMixerRef.current) {
        const delta = clockRef.current.getDelta();
        animationMixerRef.current.update(delta);
      }

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      frameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (modelRef.current && sceneRef.current) {
        sceneRef.current.remove(modelRef.current);
      }
      
      rendererRef.current?.dispose();
    };
  }, []);

  // Update model when modelIndex changes
  useEffect(() => {
    loadModel(modelIndex);
  }, [modelIndex]);

  const loadModel = (index: number) => {
    if (!sceneRef.current) return;
    
    // Remove previous model if exists
    if (modelRef.current && sceneRef.current) {
      sceneRef.current.remove(modelRef.current);
      modelRef.current = null;
    }

    // Convert index to letter (0 = a, 1 = b, etc.)
    const modelLetter = String.fromCharCode(97 + index); // 97 is ASCII for 'a'
    
    // Use the correct path format for your models
    const modelPath = `/models/character-${modelLetter}.glb`;
    
    console.log(`Loading model from path: ${modelPath}`);
    
    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        
        // Apply scale
        model.scale.set(scale, scale, scale);
        
        // Center model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x = -center.x;
        model.position.y = -center.y;
        model.position.z = -center.z;
        
        // Add model to scene
        sceneRef.current?.add(model);
        modelRef.current = model;
        
        // Setup animations if available
        if (gltf.animations && gltf.animations.length) {
          animationMixerRef.current = new THREE.AnimationMixer(model);
          const idleAnimation = gltf.animations[0]; // Assuming first animation is idle
          const action = animationMixerRef.current.clipAction(idleAnimation);
          action.play();
        }
      },
      (xhr) => {
        // Progress callback
        console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
      },
      (error) => {
        // Error callback
        console.error('Error loading model:', error);
        
        // If model fails to load, create a simple placeholder
        createPlaceholderModel(index);
      }
    );
  };
  
  // Create a simple placeholder model if the GLB fails to load
  const createPlaceholderModel = (index: number) => {
    if (!sceneRef.current) return;
    
    // Create a simple character with different colors based on index
    const group = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(1, 1.5, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xd1a788 // Skin tone
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.scale.set(1.5, 1, 1);
    group.add(body);
    
    // Head
    const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xd1a788 // Skin tone
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 1.25, 0);
    group.add(head);
    
    // Hair - color varies by index
    const hairColors = [
      0x8b4513, 0x000000, 0xf5deb3, 0xb22222, 
      0xf5f5f5, 0x4169e1, 0x2e8b57, 0x800080
    ];
    const hairColor = hairColors[index % hairColors.length];
    
    const hairGeometry = new THREE.BoxGeometry(0.85, 0.2, 0.85);
    const hairMaterial = new THREE.MeshStandardMaterial({ color: hairColor });
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.set(0, 1.65, 0);
    group.add(hair);
    
    // Arms
    const armGeometry = new THREE.BoxGeometry(0.25, 1, 0.25);
    const armMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xd1a788 // Skin tone
    });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.75, 0.25, 0);
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.75, 0.25, 0);
    group.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.25, 1, 0.25);
    const legMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xd1a788 // Skin tone
    });
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.25, -1.25, 0);
    group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.25, -1.25, 0);
    group.add(rightLeg);
    
    // Armor - color varies by index
    const armorColors = [
      0xc0c0c0, 0xffd700, 0x2c2c2c, 0xcd7f32, 
      0x4169e1, 0xb22222, 0x2e8b57, 0x800080
    ];
    const armorColor = armorColors[index % armorColors.length];
    
    const armorGeometry = new THREE.BoxGeometry(1.1, 1.6, 0.2);
    const armorMaterial = new THREE.MeshStandardMaterial({ 
      color: armorColor,
      metalness: 0.8,
      roughness: 0.2
    });
    const armor = new THREE.Mesh(armorGeometry, armorMaterial);
    armor.position.set(0, 0.25, 0.3);
    group.add(armor);
    
    // Eyes
    const eyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.01);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 1.25, 0.41);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 1.25, 0.41);
    group.add(rightEye);
    
    // Pupils
    const pupilGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.01);
    const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.2, 1.25, 0.42);
    group.add(leftPupil);
    
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0.2, 1.25, 0.42);
    group.add(rightPupil);
    
    // Add the group to the scene
    group.position.set(0, -1, 0);
    group.scale.set(0.6, 0.6, 0.6);
    sceneRef.current.add(group);
    modelRef.current = group;
    
    console.log(`Created placeholder model for index ${index}`);
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full rounded-lg overflow-hidden"
      style={{ minHeight: '300px' }}
    />
  );
});

CharacterModelViewer.displayName = 'CharacterModelViewer';