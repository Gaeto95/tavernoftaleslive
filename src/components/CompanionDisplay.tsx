import React, { useState } from 'react';
import { User, Heart, Shield, MessageSquare, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Companion } from '../types/game';

interface CompanionDisplayProps {
  companion: Companion;
  onDismiss?: () => void;
  onInteract?: (interaction: string) => void;
  isMinimized?: boolean;
}

export function CompanionDisplay({ 
  companion, 
  onDismiss, 
  onInteract,
  isMinimized = false
}: CompanionDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(!isMinimized);
  const [interactionInput, setInteractionInput] = useState('');

  const getLoyaltyColor = () => {
    if (companion.loyalty >= 80) return 'text-green-400';
    if (companion.loyalty >= 50) return 'text-amber-400';
    if (companion.loyalty >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRelationshipBadge = () => {
    switch (companion.relationship) {
      case 'loyal':
        return <span className="px-2 py-1 bg-green-600/30 border border-green-500 rounded-full text-green-300 text-xs">Loyal</span>;
      case 'neutral':
        return <span className="px-2 py-1 bg-blue-600/30 border border-blue-500 rounded-full text-blue-300 text-xs">Neutral</span>;
      case 'suspicious':
        return <span className="px-2 py-1 bg-orange-600/30 border border-orange-500 rounded-full text-orange-300 text-xs">Suspicious</span>;
      case 'hostile':
        return <span className="px-2 py-1 bg-red-600/30 border border-red-500 rounded-full text-red-300 text-xs">Hostile</span>;
      default:
        return null;
    }
  };

  const handleInteraction = () => {
    if (interactionInput.trim() && onInteract) {
      onInteract(interactionInput.trim());
      setInteractionInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInteraction();
    }
  };

  return (
    <div className={`companion-card bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-600/30 rounded-lg overflow-hidden transition-all duration-300 ${
      isExpanded ? 'max-h-96' : 'max-h-16'
    }`}>
      {/* Header - Always visible */}
      <div 
        className="p-3 border-b border-amber-600/20 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center">
            <User className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="text-amber-300 font-medium">{companion.name}</h3>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getRelationshipBadge()}
          
          {onDismiss && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
              title="Dismiss companion"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-amber-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-400" />
          )}
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3">
          {/* Companion Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 bg-amber-900/20 border border-amber-600/30 rounded">
              <Heart className="w-4 h-4 text-red-400 mx-auto mb-1" />
              <div className={`text-sm font-bold ${getLoyaltyColor()}`}>
                {companion.loyalty}%
              </div>
              <div className="text-xs text-amber-300">Loyalty</div>
            </div>
            
            <div className="text-center p-2 bg-amber-900/20 border border-amber-600/30 rounded">
              <Shield className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-sm font-bold text-blue-300">
                {companion.skills.length}
              </div>
              <div className="text-xs text-amber-300">Skills</div>
            </div>
            
            <div className="text-center p-2 bg-amber-900/20 border border-amber-600/30 rounded">
              <MessageSquare className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <div className="text-sm font-bold text-green-300">
                {companion.memories.length}
              </div>
              <div className="text-xs text-amber-300">Memories</div>
            </div>
          </div>
          
          {/* Description */}
          <div className="mb-3">
            <p className="text-amber-200 text-sm">{companion.description}</p>
          </div>
          
          {/* Skills */}
          <div className="mb-3">
            <h4 className="text-amber-300 text-xs font-medium mb-1">Skills:</h4>
            <div className="flex flex-wrap gap-1">
              {companion.skills.map((skill, index) => (
                <span 
                  key={index}
                  className="text-xs bg-blue-900/30 border border-blue-600/30 rounded-full px-2 py-0.5 text-blue-300"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
          
          {/* Last Interaction */}
          <div className="mb-3">
            <h4 className="text-amber-300 text-xs font-medium mb-1">Last Interaction:</h4>
            <p className="text-amber-100 text-xs italic bg-gray-800/50 p-2 rounded">
              "{companion.lastInteraction}"
            </p>
          </div>
          
          {/* Interaction Input */}
          {onInteract && (
            <div className="mt-3 pt-3 border-t border-amber-600/20">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={interactionInput}
                  onChange={(e) => setInteractionInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Speak to ${companion.name}...`}
                  className="flex-1 p-2 spell-input rounded text-amber-50 text-xs"
                />
                <button
                  onClick={handleInteraction}
                  disabled={!interactionInput.trim()}
                  className="px-3 py-1 rune-button rounded text-xs font-medium text-black disabled:opacity-50"
                >
                  Speak
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}