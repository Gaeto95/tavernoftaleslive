import React, { useState, useEffect } from 'react';
import { X, Sparkles, Skull, Flame, Wand2 } from 'lucide-react';
import { playCharacterSound } from '../utils/soundEffects';

interface VillainIntroductionProps {
  onClose: () => void;
}

export function VillainIntroduction({ onClose }: VillainIntroductionProps) {
  const [animationStage, setAnimationStage] = useState(0);
  
  useEffect(() => {
    // Play ominous sound when component mounts
    playCharacterSound('damage');
    
    // Sequence the animation
    const timer1 = setTimeout(() => setAnimationStage(1), 1000);
    const timer2 = setTimeout(() => setAnimationStage(2), 2500);
    const timer3 = setTimeout(() => setAnimationStage(3), 4000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="relative max-w-2xl w-full mx-4">
        {/* Close Button - only visible after full animation */}
        {animationStage >= 3 && (
          <button
            onClick={onClose}
            className="absolute -top-4 -right-4 z-10 bg-black/80 backdrop-blur-sm border border-purple-600/50 rounded-full p-2 text-purple-300 hover:text-purple-200 transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Villain Card */}
        <div className={`bg-gradient-to-b from-purple-900/40 via-purple-800/30 to-black/50 border-2 border-purple-600 rounded-2xl overflow-hidden shadow-2xl transition-all duration-1000 ${
          animationStage > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}>
          {/* Animated Header */}
          <div className="p-8 border-b border-purple-600/50 text-center relative">
            {/* Animated magical elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
              <div className="absolute top-3/4 right-1/3 w-2 h-2 bg-purple-500 rounded-full animate-ping" style={{ animationDuration: '2.3s' }}></div>
              <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-purple-600 rounded-full animate-ping" style={{ animationDuration: '2.7s' }}></div>
            </div>
            
            <div className="relative inline-block mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-700 to-purple-900 flex items-center justify-center mx-auto">
                <Wand2 className="w-10 h-10 text-purple-300" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-purple-300 animate-pulse" />
              <Flame className="absolute -bottom-2 -left-2 w-6 h-6 text-purple-400 animate-pulse" />
            </div>
            
            <h2 className={`fantasy-title text-3xl font-bold text-purple-300 mb-3 ${
              animationStage >= 2 ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-1000`}>
              GAETO
            </h2>
            
            <p className={`text-xl text-purple-200 mb-2 ${
              animationStage >= 2 ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-1000 delay-300`}>
              The Dark Archmage
            </p>
          </div>

          {/* Content */}
          <div className={`p-6 ${
            animationStage >= 3 ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-1000`}>
            <div className="space-y-4">
              <p className="text-purple-100 leading-relaxed">
                A name whispered in fear throughout the realm. Gaeto, the dark wizard whose ambition knows no bounds. His mastery of forbidden magic has made him both feared and respected among those who practice the arcane arts.
              </p>
              
              <p className="text-purple-100 leading-relaxed">
                Rumors speak of his quest for ancient artifacts of immense power, and his willingness to eliminate anyone who stands in his way. Some say he was once a respected member of the Mage's Guild before his fall into darkness.
              </p>
              
              <div className="mt-6 p-4 bg-purple-900/20 border border-purple-600/30 rounded-lg">
                <h4 className="text-purple-300 font-medium mb-2 flex items-center">
                  <Skull className="w-4 h-4 mr-2" />
                  Beware
                </h4>
                <p className="text-purple-200 text-sm">
                  Your actions have drawn his attention. As your power grows, so too does his interest in your journey. The paths of your destinies are now intertwined.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`p-4 border-t border-purple-600/30 text-center ${
            animationStage >= 3 ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-1000 delay-500`}>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-600 hover:to-purple-800 border border-purple-500 rounded-lg text-white font-bold transition-colors"
            >
              Continue Your Journey
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}