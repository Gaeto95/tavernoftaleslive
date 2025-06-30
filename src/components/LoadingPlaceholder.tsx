import React from 'react';
import { Crown, Loader, Volume2 } from 'lucide-react';

interface LoadingPlaceholderProps {
  isGeneratingText?: boolean;
  isGeneratingVoice?: boolean;
  isGeneratingImage?: boolean;
}

export function LoadingPlaceholder({ 
  isGeneratingText = true, 
  isGeneratingVoice = false, 
  isGeneratingImage = false 
}: LoadingPlaceholderProps) {
  return (
    <div className="scroll-appear">
      <div className="flex items-start space-x-2">
        {/* Smaller Storyteller Avatar */}
        <div className="flex-shrink-0 p-1.5 rounded-full border bg-amber-600 border-amber-400">
          <Crown className="w-3 h-3 text-white" />
        </div>
        
        {/* Loading Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-medium text-amber-300">
              Storyteller
            </span>
            
            {/* Voice loading indicator */}
            {isGeneratingVoice && (
              <div className="flex items-center space-x-1 text-amber-400">
                <Volume2 className="w-3 h-3 animate-pulse" />
                <span className="text-xs">Weaving voice...</span>
              </div>
            )}
          </div>
          
          {/* Clean Loading Content */}
          <div className="text-amber-100 bg-amber-900/10 border-l-4 border-amber-400 pl-3 py-2 rounded-r-lg">
            {isGeneratingText ? (
              <div className="flex items-center space-x-2">
                <Loader className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-amber-300 text-xs mb-1">
                    The Storyteller weaves your tale...
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-amber-300 text-xs">
                Preparing mystical narration...
              </div>
            )}
          </div>
          
          {/* Additional status indicators */}
          {(isGeneratingVoice || isGeneratingImage) && (
            <div className="mt-1 flex items-center space-x-3 text-xs text-amber-400">
              {isGeneratingVoice && (
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-xs">Voice synthesis</span>
                </div>
              )}
              {isGeneratingImage && (
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                  <span className="text-xs">Scene manifestation</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}