import React, { useEffect, useRef } from 'react';
import { User, Crown } from 'lucide-react';
import { StoryEntry } from '../types/game';
import { VoicePlayer } from './VoicePlayer';
import { TypewriterText } from './TypewriterText';

interface StoryHistoryProps {
  entries: StoryEntry[];
  onToggleVoice: (entryId: string, isPlaying: boolean) => void;
  autoPlayVoice?: boolean;
}

export function StoryHistory({ entries, onToggleVoice, autoPlayVoice }: StoryHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastEntryRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Improved auto-scroll with better mobile support
  const scrollToBottom = () => {
    if (isScrollingRef.current) return; // Prevent scroll conflicts
    
    if (scrollRef.current && lastEntryRef.current) {
      isScrollingRef.current = true;
      
      const scrollElement = scrollRef.current;
      const lastEntry = lastEntryRef.current;
      
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        try {
          // Check if we need to scroll
          const containerRect = scrollElement.getBoundingClientRect();
          const entryRect = lastEntry.getBoundingClientRect();
          
          if (entryRect.bottom > containerRect.bottom) {
            lastEntry.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'end',
              inline: 'nearest'
            });
          }
        } catch (error) {
          console.warn('Scroll error:', error);
        } finally {
          // Reset scroll flag after animation
          setTimeout(() => {
            isScrollingRef.current = false;
          }, 500);
        }
      });
    }
  };

  // Auto-scroll when new entries are added
  useEffect(() => {
    scrollToBottom();
  }, [entries]);

  // Handle typewriter progress for continuous scrolling
  const handleTypewriterProgress = () => {
    if (!isScrollingRef.current) {
      scrollToBottom();
    }
  };

  return (
    <div className="space-y-3" ref={scrollRef}>
      {entries.map((entry, index) => {
        const isLatestDMEntry = entry.type === 'dm' && 
          index === entries.length - 1 && 
          entries[entries.length - 1]?.type === 'dm';
        
        const isLastEntry = index === entries.length - 1;

        return (
          <div
            key={`story-${entry.id}`}
            ref={isLastEntry ? lastEntryRef : undefined}
            className="scroll-appear"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start space-x-3">
              {/* Avatar */}
              <div className={`flex-shrink-0 p-2 rounded-full border ${
                entry.type === 'player' 
                  ? 'bg-blue-600 border-blue-400' 
                  : 'bg-amber-600 border-amber-400'
              }`}>
                {entry.type === 'player' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Crown className="w-4 h-4 text-white" />
                )}
              </div>
              
              {/* Message Content */}
              <div className="flex-1 min-w-0">
                {/* Header with name and voice controls */}
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`text-sm font-medium ${
                    entry.type === 'player' ? 'text-blue-300' : 'text-amber-300'
                  }`}>
                    {entry.type === 'player' ? 'You' : 'Storyteller'}
                  </span>
                  
                  {entry.type === 'dm' && entry.voiceUrl && (
                    <VoicePlayer
                      voiceUrl={entry.voiceUrl}
                      isLoading={!entry.voiceUrl && entry.content.length > 0}
                      autoPlay={autoPlayVoice && isLatestDMEntry}
                      onToggle={(isPlaying) => onToggleVoice(entry.id, isPlaying)}
                    />
                  )}
                </div>
                
                {/* Message Content */}
                <div className={`${
                  entry.type === 'player' 
                    ? 'text-blue-100 bg-blue-900/20 border-l-4 border-blue-400 pl-3 py-2' 
                    : 'text-amber-100 bg-amber-900/10 border-l-4 border-amber-400 pl-3 py-2'
                } rounded-r-lg`}>
                  {/* Message text with typewriter effect for latest DM entry */}
                  {entry.type === 'dm' && isLatestDMEntry ? (
                    <TypewriterText
                      text={entry.content}
                      speed={30}
                      onProgress={handleTypewriterProgress}
                      onComplete={() => {
                        // Trigger voice after typewriter completes
                        if (autoPlayVoice && entry.voiceUrl) {
                          setTimeout(() => {
                            onToggleVoice(entry.id, true);
                          }, 500);
                        }
                      }}
                      startDelay={300}
                    />
                  ) : (
                    entry.content.split('\n').map((paragraph, pIndex) => (
                      <p key={`para-${entry.id}-${pIndex}`} className="mb-1 last:mb-0 leading-relaxed text-sm">
                        {paragraph}
                      </p>
                    ))
                  )}
                </div>

                {/* Dice rolls display */}
                {entry.diceRolls && entry.diceRolls.length > 0 && (
                  <div className="mt-2 text-xs text-amber-400 bg-amber-900/20 p-2 rounded-lg">
                    <div className="font-medium mb-1">Dice Rolls:</div>
                    <div className="space-y-1">
                      {entry.diceRolls.map((roll, rollIndex) => (
                        <div key={`roll-${entry.id}-${rollIndex}`} className="flex justify-between">
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
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}