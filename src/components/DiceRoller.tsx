import React, { useState, useEffect, useRef } from 'react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Sparkles } from 'lucide-react';
import { playDiceRoll, playDiceResult } from '../utils/soundEffects';

interface DiceRollerProps {
  isEnabled: boolean;
  onRoll: (result: number, isChaos?: boolean) => void;
  diceType?: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';
  isChaos?: boolean;
}

export function DiceRoller({ 
  isEnabled, 
  onRoll, 
  diceType = 'd20',
  isChaos = false
}: DiceRollerProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [rollHistory, setRollHistory] = useState<number[]>([]);
  const [diceRotation, setDiceRotation] = useState({ x: 0, y: 0, z: 0 });
  const diceRef = useRef<HTMLDivElement>(null);
  const rollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getMaxValue = () => {
    switch (diceType) {
      case 'd4': return 4;
      case 'd6': return 6;
      case 'd8': return 8;
      case 'd10': return 10;
      case 'd12': return 12;
      case 'd20': return 20;
      default: return 20;
    }
  };

  const handleRoll = () => {
    if (!isEnabled || isRolling) return;
    
    setIsRolling(true);
    setResult(null);
    
    // Play dice roll sound
    playDiceRoll();
    
    // Generate random rotations for 3D effect
    const randomRotations = () => {
      return {
        x: Math.floor(Math.random() * 360),
        y: Math.floor(Math.random() * 360),
        z: Math.floor(Math.random() * 360)
      };
    };
    
    // Simulate rolling animation with changing numbers and rotations
    let rollCount = 0;
    const maxRolls = 10;
    const maxValue = getMaxValue();
    
    const rollInterval = setInterval(() => {
      const randomValue = Math.floor(Math.random() * maxValue) + 1;
      setResult(randomValue);
      setDiceRotation(randomRotations());
      rollCount++;
      
      if (rollCount >= maxRolls) {
        clearInterval(rollInterval);
        const finalResult = Math.floor(Math.random() * maxValue) + 1;
        
        // Set final rotation based on result
        const finalRotation = getFinalRotation(finalResult, diceType);
        setDiceRotation(finalRotation);
        
        setResult(finalResult);
        setRollHistory(prev => [finalResult, ...prev].slice(0, 5));
        
        // Add a slight delay before completing the roll
        if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
        rollTimeoutRef.current = setTimeout(() => {
          // Play appropriate sound based on result
          playDiceResult(finalResult, finalResult === maxValue || finalResult === 1);
          
          onRoll(finalResult, isChaos);
          setIsRolling(false);
          
          // Add impact effect to the dice
          if (diceRef.current) {
            diceRef.current.classList.add('dice-impact');
            setTimeout(() => {
              if (diceRef.current) {
                diceRef.current.classList.remove('dice-impact');
              }
            }, 300);
          }
        }, 500);
      }
    }, 100);
  };

  // Get final rotation based on result to show the correct face
  const getFinalRotation = (value: number, type: string) => {
    if (type === 'd6') {
      // For d6, we want to show specific faces
      switch(value) {
        case 1: return { x: 0, y: 0, z: 0 };
        case 2: return { x: 0, y: 90, z: 0 };
        case 3: return { x: 90, y: 0, z: 0 };
        case 4: return { x: -90, y: 0, z: 0 };
        case 5: return { x: 0, y: -90, z: 0 };
        case 6: return { x: 180, y: 0, z: 0 };
        default: return { x: 0, y: 0, z: 0 };
      }
    }
    
    // For other dice types, just use random final rotation
    return {
      x: Math.floor(Math.random() * 360),
      y: Math.floor(Math.random() * 360),
      z: Math.floor(Math.random() * 360)
    };
  };

  const getDiceIcon = (value: number | null) => {
    if (value === null) return null;
    
    // For d6, use the actual dice face icons
    if (diceType === 'd6') {
      switch (value) {
        case 1: return <Dice1 className="w-full h-full" />;
        case 2: return <Dice2 className="w-full h-full" />;
        case 3: return <Dice3 className="w-full h-full" />;
        case 4: return <Dice4 className="w-full h-full" />;
        case 5: return <Dice5 className="w-full h-full" />;
        case 6: return <Dice6 className="w-full h-full" />;
        default: return null;
      }
    }
    
    // For other dice, just show the number
    return <span className="text-3xl font-bold">{value}</span>;
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (rollTimeoutRef.current) {
        clearTimeout(rollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`${isChaos ? 'chaos-dice' : 'standard-dice'} dice-container`}>
      <button
        onClick={handleRoll}
        disabled={!isEnabled || isRolling}
        className={`relative w-16 h-16 rounded-lg flex items-center justify-center transition-all duration-300 ${
          isEnabled 
            ? isRolling
              ? 'cursor-not-allowed'
              : 'cursor-pointer hover:scale-110'
            : 'opacity-50 cursor-not-allowed'
        } ${
          isChaos
            ? 'bg-gradient-to-br from-purple-700 via-pink-600 to-amber-500 border-2 border-purple-400 shadow-lg shadow-purple-500/30'
            : 'bg-gradient-to-br from-amber-700 to-amber-900 border-2 border-amber-500 shadow-lg shadow-amber-500/30'
        }`}
        title={`Roll ${diceType}${isChaos ? ' (Chaos Dice)' : ''}`}
      >
        <div 
          ref={diceRef}
          className={`dice-3d ${isRolling ? 'rolling' : ''}`}
          style={{
            transform: `rotateX(${diceRotation.x}deg) rotateY(${diceRotation.y}deg) rotateZ(${diceRotation.z}deg)`
          }}
        >
          {result ? getDiceIcon(result) : (
            isChaos 
              ? <Sparkles className="w-8 h-8 text-white" />
              : <div className="w-8 h-8 text-white font-bold">{diceType}</div>
          )}
        </div>
        
        {/* Critical success/fail indicators */}
        {result === getMaxValue() && !isRolling && (
          <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
            CRIT!
          </div>
        )}
        
        {result === 1 && !isRolling && diceType === 'd20' && (
          <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
            FAIL!
          </div>
        )}
        
        {/* Glow effect for chaos dice */}
        {isChaos && (
          <div className="absolute inset-0 rounded-lg bg-purple-500/20 blur-md -z-10 animate-pulse"></div>
        )}
      </button>
      
      {/* Roll History */}
      {rollHistory.length > 0 && (
        <div className="mt-2 text-center">
          <div className={`text-xs ${isChaos ? 'text-purple-300' : 'text-amber-300'}`}>
            Last: {rollHistory[0]}
          </div>
        </div>
      )}
      
      {/* Add CSS for 3D dice effect */}
      <style jsx="true">{`
        .dice-3d {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform-style: preserve-3d;
        }
        
        .dice-3d.rolling {
          transition: transform 0.1s linear;
        }
        
        .dice-impact {
          animation: impact 0.3s ease-out;
        }
        
        @keyframes impact {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}