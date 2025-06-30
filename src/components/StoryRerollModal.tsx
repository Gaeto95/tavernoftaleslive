import React from 'react';
import { RefreshCw, X } from 'lucide-react';

interface StoryRerollModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function StoryRerollModal({ onConfirm, onCancel }: StoryRerollModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="parchment-panel p-6 max-w-md w-full mx-4 text-center">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-amber-400 hover:text-amber-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="mb-6">
          <RefreshCw className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="fantasy-title text-2xl font-bold text-amber-300 mb-2">
            Reroll Story Response?
          </h2>
          <p className="text-amber-200 text-lg">
            The storyteller will craft a new response to your last action.
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-amber-300 text-sm">
            Sometimes the storyteller's response might not align with your expectations or the narrative direction you envision. Rerolling gives you a chance to explore a different outcome.
          </p>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 border border-amber-600 rounded-lg text-amber-200 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={onConfirm}
              className="rune-button px-6 py-3 rounded-lg font-bold text-black flex items-center space-x-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Reroll Response</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}