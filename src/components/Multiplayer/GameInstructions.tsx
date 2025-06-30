import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Play, MessageSquare, Trophy, Clock, X, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GameInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: 'host' | 'player';
}

interface Instruction {
  section: string;
  title: string;
  content: string;
  order_num: number;
}

export function GameInstructions({ isOpen, onClose, userRole = 'player' }: GameInstructionsProps) {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [activeSection, setActiveSection] = useState<string>('getting_started');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadInstructions();
    }
  }, [isOpen]);

  const loadInstructions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_game_instructions');
      
      if (error) {
        console.error('Failed to load instructions:', error);
        return;
      }
      
      setInstructions(data || []);
    } catch (err) {
      console.error('Error loading instructions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getIconForSection = (section: string) => {
    switch (section) {
      case 'getting_started': return Play;
      case 'character_creation': return Users;
      case 'joining_sessions': return Users;
      case 'game_flow': return Clock;
      case 'dm_role': return Users;
      case 'turn_system': return Clock;
      case 'chat_system': return MessageSquare;
      case 'winning_losing': return Trophy;
      default: return BookOpen;
    }
  };

  const filteredInstructions = instructions.filter(instruction => {
    if (userRole === 'host') return true; // Hosts see all instructions
    return instruction.section !== 'dm_role'; // Players don't see host-specific instructions
  });

  const activeInstruction = instructions.find(i => i.section === activeSection);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="parchment-panel p-8 max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8 text-amber-400" />
            <div>
              <h2 className="fantasy-title text-3xl font-bold text-amber-300 glow-text">
                Game Instructions
              </h2>
              <p className="text-amber-200">
                {userRole === 'host' ? 'Host Guide' : 'Player Guide'} - Learn how to play
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-amber-400 hover:text-amber-300 transition-colors p-2 hover:bg-amber-900/30 rounded-lg"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-amber-300">Loading instructions...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex gap-6 min-h-0">
            {/* Sidebar Navigation */}
            <div className="w-80 flex-shrink-0">
              <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 h-full overflow-y-auto">
                <h3 className="fantasy-title text-lg text-amber-300 mb-4">Topics</h3>
                <div className="space-y-2">
                  {filteredInstructions.map((instruction) => {
                    const IconComponent = getIconForSection(instruction.section);
                    const isActive = activeSection === instruction.section;
                    
                    return (
                      <button
                        key={instruction.section}
                        onClick={() => setActiveSection(instruction.section)}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all duration-200 ${
                          isActive
                            ? 'bg-amber-600/30 border border-amber-500 text-amber-100 shadow-lg'
                            : 'hover:bg-amber-900/30 text-amber-300 hover:text-amber-200'
                        }`}
                      >
                        <IconComponent className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">{instruction.title}</span>
                        {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="bg-amber-900/10 border border-amber-600/20 rounded-lg p-8 h-full overflow-y-auto">
                {activeInstruction ? (
                  <div>
                    <div className="flex items-center space-x-3 mb-6">
                      {React.createElement(getIconForSection(activeInstruction.section), {
                        className: "w-8 h-8 text-amber-400"
                      })}
                      <h3 className="fantasy-title text-2xl font-bold text-amber-300">
                        {activeInstruction.title}
                      </h3>
                    </div>
                    
                    <div className="prose prose-amber max-w-none">
                      <p className="text-amber-200 text-lg leading-relaxed">
                        {activeInstruction.content}
                      </p>
                      
                      {/* Additional detailed content based on section */}
                      {activeInstruction.section === 'getting_started' && (
                        <div className="mt-6 space-y-4">
                          <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
                            <h4 className="text-green-300 font-bold mb-2">Quick Start Checklist:</h4>
                            <ul className="text-green-200 space-y-1">
                              <li>✓ Create or select a character</li>
                              <li>✓ Browse and join a session (or create your own)</li>
                              <li>✓ Mark yourself as "Ready"</li>
                              <li>✓ Wait for the host to start the game</li>
                              <li>✓ Submit actions when prompted</li>
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      {activeInstruction.section === 'turn_system' && (
                        <div className="mt-6 space-y-4">
                          <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                            <h4 className="text-blue-300 font-bold mb-2">Turn Phases:</h4>
                            <div className="space-y-2 text-blue-200">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                                <span><strong>Waiting:</strong> Host prepares the next turn</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                <span><strong>Collecting:</strong> Players submit their actions</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                                <span><strong>Processing:</strong> Host resolves all actions</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                                <span><strong>Completed:</strong> Story advances to next turn</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {activeInstruction.section === 'dm_role' && userRole === 'host' && (
                        <div className="mt-6 space-y-4">
                          <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4">
                            <h4 className="text-amber-300 font-bold mb-2">Host Controls:</h4>
                            <ul className="text-amber-200 space-y-2">
                              <li><strong>Start Game:</strong> Begin the adventure when all players are ready</li>
                              <li><strong>Start Turn:</strong> Begin collecting player actions</li>
                              <li><strong>Process Turn:</strong> Resolve actions and advance story</li>
                              <li><strong>Manage Players:</strong> Remove disruptive players</li>
                              <li><strong>Session Settings:</strong> Configure turn timers and rules</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-amber-600 mx-auto mb-4" />
                    <p className="text-amber-400">Select a topic from the sidebar to view instructions</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-amber-600/30 text-center">
          <p className="text-amber-400 text-sm">
            Need more help? Use the chat system in-game to ask other players!
          </p>
          <button
            onClick={onClose}
            className="mt-4 rune-button px-8 py-3 rounded-lg font-bold text-black fantasy-title"
          >
            Start Playing!
          </button>
        </div>
      </div>
    </div>
  );
}