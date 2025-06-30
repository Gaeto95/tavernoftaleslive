import React, { useEffect, useRef } from 'react';

interface ModelViewerProps {
  modelIndex: number;
}

export function ModelViewer({ modelIndex }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous content
    containerRef.current.innerHTML = '';

    // Create a placeholder for the model
    const modelElement = document.createElement('div');
    modelElement.className = 'w-full h-full flex items-center justify-center';
    
    // Style based on model index to simulate different models
    const colors = [
      'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500',
      'bg-amber-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500',
      'bg-sky-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-rose-500',
      'bg-lime-500', 'bg-orange-500'
    ];
    
    // Create a simple character representation
    const characterDiv = document.createElement('div');
    characterDiv.className = `relative ${colors[modelIndex % colors.length]} w-32 h-48 rounded-lg`;
    
    // Add head
    const head = document.createElement('div');
    head.className = 'absolute -top-10 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full bg-amber-200';
    
    // Add eyes
    const leftEye = document.createElement('div');
    leftEye.className = 'absolute top-4 left-4 w-2 h-2 rounded-full bg-gray-800';
    
    const rightEye = document.createElement('div');
    rightEye.className = 'absolute top-4 right-4 w-2 h-2 rounded-full bg-gray-800';
    
    // Add mouth
    const mouth = document.createElement('div');
    mouth.className = 'absolute bottom-4 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-gray-800';
    
    // Assemble head
    head.appendChild(leftEye);
    head.appendChild(rightEye);
    head.appendChild(mouth);
    
    // Add to character
    characterDiv.appendChild(head);
    
    // Add character to model element
    modelElement.appendChild(characterDiv);
    
    // Add model element to container
    containerRef.current.appendChild(modelElement);
    
    // Add model index text
    const indexText = document.createElement('div');
    indexText.className = 'absolute bottom-2 left-0 right-0 text-center text-amber-300 text-xs';
    indexText.textContent = `Model ${modelIndex + 1}`;
    containerRef.current.appendChild(indexText);
    
  }, [modelIndex]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg border border-amber-600/30"
    >
      <div className="text-amber-300">Loading model...</div>
    </div>
  );
}