import React, { useRef, useEffect } from 'react';
import { BookOpen, X, Volume2, User, Crown } from 'lucide-react';
import { StoryEntry } from '../types/game';
import { VoicePlayer } from './VoicePlayer';

interface JournalLogProps {
  entries: StoryEntry[];
  onToggleVoice: (entryId: string, isPlaying: boolean) => void;
  autoPlayVoice?: boolean;
  onClose: () => void;
}

export function JournalLog({ entries, onToggleVoice, autoPlayVoice = false, onClose }: JournalLogProps) {
  const journalEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (journalEndRef.current) {
      journalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-amber-600/30 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <h3 className="fantasy-title text-base text-amber-300">Adventure Journal</h3>
        </div>
        <button
          onClick={onClose}
          className="text-amber-400 hover:text-amber-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Journal Content */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {entries.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-10 h-10 text-amber-600/50 mx-auto mb-3" />
            <p className="text-amber-400 italic text-sm">Your adventure has yet to begin...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div 
                key={`journal-entry-${entry.type}-${entry.id}`} 
                className={`journal-entry ${
                  entry.type === 'player' 
                    ? 'player-entry' 
                    : entry.type === 'dm' 
                    ? 'dm-entry' 
                    : 'system-entry'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {/* Avatar */}
                  <div className={`flex-shrink-0 p-1 rounded-full border ${
                    entry.type === 'player' 
                      ? 'bg-blue-600 border-blue-400' 
                      : entry.type === 'dm'
                      ? 'bg-amber-600 border-amber-400'
                      : 'bg-purple-600 border-purple-400'
                  }`}>
                    {entry.type === 'player' ? (
                      <User className="w-3 h-3 text-white" />
                    ) : entry.type === 'dm' ? (
                      <Crown className="w-3 h-3 text-white" />
                    ) : (
                      <BookOpen className="w-3 h-3 text-white" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-xs font-medium ${
                        entry.type === 'player' 
                          ? 'text-blue-300' 
                          : entry.type === 'dm'
                          ? 'text-amber-300'
                          : 'text-purple-300'
                      }`}>
                        {entry.type === 'player' 
                          ? 'You' 
                          : entry.type === 'dm' 
                          ? 'Storyteller' 
                          : 'Journal'}
                      </span>
                      
                      {/* Voice control for DM entries */}
                      {entry.type === 'dm' && entry.voiceUrl && (
                        <VoicePlayer
                          voiceUrl={entry.voiceUrl}
                          isLoading={!entry.voiceUrl && entry.content.length > 0}
                          autoPlay={autoPlayVoice && entry === entries[entries.length - 1] && entry.type === 'dm'}
                          onToggle={(isPlaying) => onToggleVoice(entry.id, isPlaying)}
                        />
                      )}
                    </div>
                    
                    <div className={`${
                      entry.type === 'player' 
                        ? 'text-blue-100 bg-blue-900/20 border-l-2 border-blue-400 pl-2 py-1' 
                        : entry.type === 'dm'
                        ? 'text-amber-100 bg-amber-900/10 border-l-2 border-amber-400 pl-2 py-1'
                        : 'text-purple-100 bg-purple-900/10 border-l-2 border-purple-400 pl-2 py-1'
                    } rounded-r-lg`}>
                      {entry.content.split('\n').map((paragraph, pIndex) => (
                        <p key={`para-${entry.id}-${pIndex}`} className="mb-1 last:mb-0 leading-relaxed text-xs">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                    
                    {/* Dice rolls display - Compact */}
                    {entry.diceRolls && entry.diceRolls.length > 0 && (
                      <div className="mt-1 text-xs text-amber-400 bg-amber-900/20 p-1 rounded-lg">
                        <div className="font-medium text-xs mb-1">Dice:</div>
                        <div className="space-y-1">
                          {entry.diceRolls.map((roll, rollIndex) => (
                            <div key={`roll-${entry.id}-${rollIndex}`} className="flex justify-between text-xs">
                              <span>{roll.purpose}:</span>
                              <span className={roll.isCritical ? 'text-green-400 font-bold' : ''}>
                                {roll.result} {roll.modifier !== 0 ? (roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier) : ''} 
                                = {roll.total} {roll.isCritical ? '(Crit!)' : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Timestamp - Smaller */}
                    <div className="mt-1 text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={journalEndRef} />
          </div>
        )}
      </div>
      
      {/* Journal Footer */}
      <div className="p-2 border-t border-amber-600/30 bg-amber-900/20">
        <div className="text-xs text-amber-400 text-center">
          <p>Your adventure is recorded in these pages...</p>
        </div>
      </div>
      
      {/* Journal Styling */}
      <style jsx="true">{`
        .journal-entry {
          position: relative;
          transition: all 0.3s ease;
        }
        
        .journal-entry.dm-entry {
          animation: fadeIn 0.8s ease-out;
        }
        
        .journal-entry:not(:last-child)::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 15px;
          right: 15px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.2), transparent);
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}