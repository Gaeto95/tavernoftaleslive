import React from 'react';
import { Heart, Skull, Dice6 } from 'lucide-react';

interface DeathSaveTrackerProps {
  successes: number;
  failures: number;
  onRollDeathSave: () => void;
  isVisible: boolean;
}

export function DeathSaveTracker({ successes, failures, onRollDeathSave, isVisible }: DeathSaveTrackerProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 bg-red-900/90 border-2 border-red-600 rounded-lg p-6 backdrop-blur-sm shadow-2xl">
      <div className="text-center mb-4">
        <Skull className="w-12 h-12 text-red-400 mx-auto mb-2" />
        <h3 className="fantasy-title text-xl text-red-300 mb-2">Death Saves</h3>
        <p className="text-red-200 text-sm">You are dying. Roll to determine your fate.</p>
      </div>

      {/* Death Save Trackers */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Successes */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Heart className="w-5 h-5 text-green-400 mr-2" />
            <span className="text-green-300 font-bold">Successes</span>
          </div>
          <div className="flex justify-center space-x-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 ${
                  i <= successes 
                    ? 'bg-green-400 border-green-400' 
                    : 'border-green-400 bg-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Failures */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Skull className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-300 font-bold">Failures</span>
          </div>
          <div className="flex justify-center space-x-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 ${
                  i <= failures 
                    ? 'bg-red-400 border-red-400' 
                    : 'border-red-400 bg-transparent'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Roll Button */}
      <div className="text-center">
        <button
          onClick={onRollDeathSave}
          className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-bold text-white transition-colors flex items-center justify-center space-x-2 mx-auto"
        >
          <Dice6 className="w-5 h-5" />
          <span>Roll Death Save</span>
        </button>
        
        <div className="mt-3 text-xs text-red-300">
          <p>Roll d20: 10+ = Success, 20 = Regain 1 HP</p>
          <p>3 Successes = Stabilized, 3 Failures = Death</p>
        </div>
      </div>
    </div>
  );
}