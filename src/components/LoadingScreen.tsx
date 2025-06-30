import React, { useEffect, useState } from 'react';
import { X, Loader, Eye, Volume2, Sparkles } from 'lucide-react';

interface LoadingScreenProps {
  isVisible: boolean;
  progress: number;
  message: string;
  onClose: () => void;
}

export function LoadingScreen({ isVisible, progress, message, onClose }: LoadingScreenProps) {
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  // Animate progress smoothly
  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setAnimatedProgress(current => {
          // Move toward target progress, but smoothly
          const step = (progress - current) * 0.2; // Increased from 0.1 to 0.2 for faster progress
          return Math.min(100, current + (Math.abs(step) < 0.5 ? (step > 0 ? 0.5 : 0) : step));
        });
      }, 30); // Reduced from 50ms to 30ms for faster updates
      
      return () => clearInterval(interval);
    } else {
      setAnimatedProgress(0);
    }
  }, [isVisible, progress]);
  
  // Show close button after a delay if progress is stuck
  useEffect(() => {
    if (isVisible && progress >= 95) {
      const timer = setTimeout(() => {
        setShowCloseButton(true);
      }, 5000); // Reduced from 10 seconds to 5 seconds
      
      return () => clearTimeout(timer);
    } else {
      setShowCloseButton(false);
    }
  }, [isVisible, progress]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="max-w-md w-full mx-4 p-8 bg-gray-900/90 border-2 border-amber-600/50 rounded-2xl shadow-2xl">
        {/* Close button (only shown if loading takes too long) */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-amber-400 hover:text-amber-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        {/* Loading animation */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto">
            <div className="absolute inset-0 border-4 border-amber-600/30 rounded-full"></div>
            <div 
              className="absolute inset-0 border-4 border-transparent border-t-amber-400 rounded-full animate-spin"
              style={{ animationDuration: '1.5s' }}
            ></div>
            
            {/* Icons based on current stage */}
            <div className="absolute inset-0 flex items-center justify-center">
              {progress < 40 ? (
                <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
              ) : progress < 75 ? (
                <Eye className="w-8 h-8 text-amber-400 animate-pulse" />
              ) : (
                <Volume2 className="w-8 h-8 text-amber-400 animate-pulse" />
              )}
            </div>
          </div>
          
          {/* Magical particles */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-amber-300 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
          <div className="absolute top-3/4 right-1/3 w-2 h-2 bg-amber-400 rounded-full animate-ping" style={{ animationDuration: '2.3s' }}></div>
          <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-amber-500 rounded-full animate-ping" style={{ animationDuration: '2.7s' }}></div>
        </div>
        
        {/* Message */}
        <h3 className="fantasy-title text-2xl text-amber-300 text-center mb-4">
          {message}
        </h3>
        
        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300 ease-out"
              style={{ width: `${animatedProgress}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-amber-400">
            <span>Crafting story</span>
            <span>Generating visuals</span>
            <span>Creating voice</span>
          </div>
        </div>
        
        {/* Loading tips */}
        <div className="text-center text-amber-200 text-sm">
          <p>The storyteller is weaving your tale with care...</p>
          <p className="mt-2 text-xs text-amber-400/70 italic">
            {progress < 40 ? (
              "Crafting the perfect narrative response to your actions..."
            ) : progress < 75 ? (
              "Conjuring a visual representation of your adventure..."
            ) : (
              "Giving voice to the storyteller's words..."
            )}
          </p>
        </div>
      </div>
    </div>
  );
}