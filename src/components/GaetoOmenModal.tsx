import React, { useState, useEffect } from 'react';
import { X, Sparkles, Skull, Flame, Wand2, Book, Sword, Shield } from 'lucide-react';
import { playCharacterSound } from '../utils/soundEffects';

interface GaetoOmenModalProps {
  isOpen: boolean;
  details: {
    role: string;
    backstory: string;
    appearance: string;
    relationship: string;
  };
  onClose: () => void;
}

export function GaetoOmenModal({ isOpen, details, onClose }: GaetoOmenModalProps) {
  const [animationStage, setAnimationStage] = useState(0);
  
  useEffect(() => {
    if (!isOpen) return;
    
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
  }, [isOpen]);

  if (!isOpen) return null;

  // Get icon based on role
  const getRoleIcon = () => {
    switch (details.role.toLowerCase()) {
      case 'villain':
      case 'nemesis':
      case 'antagonist':
        return <Skull className="w-10 h-10 text-purple-300" />;
      case 'mentor':
      case 'guide':
      case 'teacher':
        return <Book className="w-10 h-10 text-purple-300" />;
      case 'rival':
      case 'competitor':
        return <Sword className="w-10 h-10 text-purple-300" />;
      case 'ally':
      case 'friend':
        return <Shield className="w-10 h-10 text-purple-300" />;
      default:
        return <Wand2 className="w-10 h-10 text-purple-300" />;
    }
  };

  // Get color scheme based on role
  const getColorScheme = () => {
    switch (details.role.toLowerCase()) {
      case 'villain':
      case 'nemesis':
      case 'antagonist':
        return {
          gradient: 'from-purple-900/40 via-purple-800/30 to-black/50',
          border: 'border-purple-600',
          text: 'text-purple-300',
          highlight: 'text-purple-200'
        };
      case 'mentor':
      case 'guide':
      case 'teacher':
        return {
          gradient: 'from-blue-900/40 via-blue-800/30 to-black/50',
          border: 'border-blue-600',
          text: 'text-blue-300',
          highlight: 'text-blue-200'
        };
      case 'rival':
      case 'competitor':
        return {
          gradient: 'from-amber-900/40 via-amber-800/30 to-black/50',
          border: 'border-amber-600',
          text: 'text-amber-300',
          highlight: 'text-amber-200'
        };
      case 'ally':
      case 'friend':
        return {
          gradient: 'from-green-900/40 via-green-800/30 to-black/50',
          border: 'border-green-600',
          text: 'text-green-300',
          highlight: 'text-green-200'
        };
      default:
        return {
          gradient: 'from-indigo-900/40 via-indigo-800/30 to-black/50',
          border: 'border-indigo-600',
          text: 'text-indigo-300',
          highlight: 'text-indigo-200'
        };
    }
  };

  const colors = getColorScheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="relative max-w-2xl w-full mx-4">
        {/* Close Button - only visible after full animation */}
        {animationStage >= 3 && (
          <button
            onClick={onClose}
            className={`absolute -top-4 -right-4 z-10 bg-black/80 backdrop-blur-sm ${colors.border} border rounded-full p-2 ${colors.text} hover:${colors.highlight} transition-colors shadow-lg`}
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Gaeto Card */}
        <div className={`bg-gradient-to-b ${colors.gradient} border-2 ${colors.border} rounded-2xl overflow-hidden shadow-2xl transition-all duration-1000 ${
          animationStage > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}>
          {/* Animated Header */}
          <div className={`p-8 border-b ${colors.border.replace('border-', 'border-')}50 text-center relative`}>
            {/* Animated magical elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
              <div className="absolute top-3/4 right-1/3 w-2 h-2 bg-purple-500 rounded-full animate-ping" style={{ animationDuration: '2.3s' }}></div>
              <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-purple-600 rounded-full animate-ping" style={{ animationDuration: '2.7s' }}></div>
            </div>
            
            <div className="relative inline-block mb-4">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${colors.gradient.replace('from-', 'from-').replace('via-', 'via-').replace('to-', 'to-')} flex items-center justify-center mx-auto`}>
                {getRoleIcon()}
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-purple-300 animate-pulse" />
              <Flame className="absolute -bottom-2 -left-2 w-6 h-6 text-purple-400 animate-pulse" />
            </div>
            
            <h2 className={`fantasy-title text-3xl font-bold ${colors.text} mb-3 ${
              animationStage >= 2 ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-1000`}>
              GAETO
            </h2>
            
            <p className={`text-xl ${colors.highlight} mb-2 ${
              animationStage >= 2 ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-1000 delay-300`}>
              {details.role}
            </p>
          </div>

          {/* Content */}
          <div className={`p-6 ${
            animationStage >= 3 ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-1000`}>
            <div className="space-y-4">
              <p className="text-white leading-relaxed">
                {details.appearance}
              </p>
              
              <p className="text-white leading-relaxed">
                {details.backstory}
              </p>
              
              <div className={`mt-6 p-4 bg-${colors.border.split('-')[1]}-900/20 border ${colors.border}/30 rounded-lg`}>
                <h4 className={`${colors.text} font-medium mb-2 flex items-center`}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Your Connection
                </h4>
                <p className={`${colors.highlight} text-sm`}>
                  {details.relationship}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`p-4 border-t ${colors.border.replace('border-', 'border-')}30 text-center ${
            animationStage >= 3 ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-1000 delay-500`}>
            <button
              onClick={onClose}
              className={`px-8 py-3 bg-gradient-to-r ${colors.gradient.replace('from-', 'from-').replace('via-', 'via-').replace('to-', 'to-').replace('/40', '').replace('/30', '').replace('/50', '')} hover:brightness-110 border ${colors.border.replace('border-', 'border-')}500 rounded-lg text-white font-bold transition-colors`}
            >
              Continue Your Journey
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}