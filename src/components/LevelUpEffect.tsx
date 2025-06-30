import React, { useEffect, useState } from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { playCharacterSound } from '../utils/soundEffects';

interface LevelUpEffectProps {
  level: number;
  onComplete: () => void;
}

export function LevelUpEffect({ level, onComplete }: LevelUpEffectProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Play level up sound when component mounts
    playCharacterSound('levelUp');
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="level-up-animation text-center">
        <div className="relative">
          <Crown className="w-24 h-24 text-amber-400 mx-auto mb-4 animate-bounce" />
          <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-300 animate-spin" />
          <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-amber-300 animate-pulse" />
        </div>
        
        <h2 className="fantasy-title text-4xl md:text-6xl font-bold text-amber-400 mb-2 glow-text animate-pulse">
          LEVEL UP!
        </h2>
        
        <p className="text-2xl md:text-3xl text-amber-300 mb-4">
          Level {level} Achieved
        </p>
        
        <div className="text-amber-200 text-lg">
          <p>Your power grows stronger!</p>
          <p className="text-sm mt-2 opacity-75">The ancient magic flows through you...</p>
        </div>
      </div>
    </div>
  );
}