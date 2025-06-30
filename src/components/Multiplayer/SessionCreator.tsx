import React, { useState } from 'react';
import { Users, ArrowLeft, Plus, Loader } from 'lucide-react';
import { User } from '../../types/multiplayer';

interface SessionCreatorProps {
  onSessionCreated: (sessionData: any) => void;
  onCancel: () => void;
  currentUser: User | null;
  isLoading?: boolean;
}

// Game mode configurations (simplified for player sessions)
const GAME_MODES = [
  {
    id: 'casual',
    name: 'Casual Adventure',
    description: 'Relaxed gameplay perfect for new players and quick sessions',
    icon: '🌟',
    settings: {
      turn_time_limit: 0, // No limit
      auto_advance_turns: false,
      allow_observers: true,
      voice_enabled: true
    }
  },
  {
    id: 'standard',
    name: 'Standard Game',
    description: 'Balanced gameplay with moderate time limits',
    icon: '🎲',
    settings: {
      turn_time_limit: 5,
      auto_advance_turns: false,
      allow_observers: true,
      voice_enabled: true
    }
  },
  {
    id: 'quick',
    name: 'Quick Session',
    description: 'Fast-paced gameplay with shorter turns',
    icon: '⚡',
    settings: {
      turn_time_limit: 3,
      auto_advance_turns: true,
      allow_observers: false,
      voice_enabled: false
    }
  },
  {
    id: 'custom',
    name: 'Custom Settings',
    description: 'Configure all settings manually for your perfect game',
    icon: '⚙️',
    settings: {
      turn_time_limit: 5,
      auto_advance_turns: false,
      allow_observers: true,
      voice_enabled: true
    }
  }
];

export function SessionCreator({ onSessionCreated, onCancel, currentUser, isLoading = false }: SessionCreatorProps) {
  const [step, setStep] = useState(1);
  const [sessionData, setSessionData] = useState({
    name: '',
    description: '',
    maxPlayers: 6,
    isPublic: true,
    password: '',
    gameMode: 'standard'
  });
  const [customSettings, setCustomSettings] = useState(GAME_MODES[1].settings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMode = GAME_MODES.find(mode => mode.id === sessionData.gameMode) || GAME_MODES[1];

  const handleCreateSession = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log('Creating session with data:', sessionData);
      
      // Use custom settings if custom mode is selected, otherwise use mode defaults
      const finalSettings = sessionData.gameMode === 'custom' ? customSettings : selectedMode.settings;

      // Create the session data object
      const sessionCreationData = {
        name: sessionData.name,
        description: sessionData.description,
        maxPlayers: sessionData.maxPlayers,
        isPublic: sessionData.isPublic,
        password: sessionData.password || undefined,
        sessionSettings: {
          ...finalSettings,
          game_mode: sessionData.gameMode
        }
      };

      console.log('Session creation data:', sessionCreationData);
      
      await onSessionCreated(sessionCreationData);
      
    } catch (err) {
      console.error('Error creating session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="parchment-panel p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onCancel}
            className="flex items-center space-x-2 text-amber-400 hover:text-amber-300 transition-colors"
            disabled={loading || isLoading}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Sessions</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-amber-400" />
            <h2 className="fantasy-title text-2xl font-bold text-amber-300">
              Create Player Session
            </h2>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center space-x-2 mb-8">
          {[1, 2, 3].map((stepNum) => (
            <div
              key={stepNum}
              className={`w-3 h-3 rounded-full ${
                step >= stepNum ? 'bg-amber-400' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="fantasy-title text-xl text-amber-300 text-center mb-6">
              Session Details
            </h3>

            <div>
              <label className="block text-amber-300 text-sm font-medium mb-2">
                Session Name *
              </label>
              <input
                type="text"
                value={sessionData.name}
                onChange={(e) => setSessionData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Epic Adventure Awaits"
                className="w-full p-3 spell-input rounded-lg text-amber-50"
                required
                disabled={loading || isLoading}
              />
            </div>

            <div>
              <label className="block text-amber-300 text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={sessionData.description}
                onChange={(e) => setSessionData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="A thrilling adventure for brave heroes..."
                className="w-full p-3 spell-input rounded-lg text-amber-50 h-24 resize-none"
                disabled={loading || isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-amber-300 text-sm font-medium mb-2">
                  Max Players
                </label>
                <select
                  value={sessionData.maxPlayers}
                  onChange={(e) => setSessionData(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
                  className="w-full p-3 spell-input rounded-lg text-amber-50"
                  disabled={loading || isLoading}
                >
                  {[2, 3, 4, 5, 6, 7, 8].map(num => (
                    <option key={num} value={num}>{num} Players</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-amber-300 text-sm font-medium mb-2">
                  Visibility
                </label>
                <select
                  value={sessionData.isPublic ? 'public' : 'private'}
                  onChange={(e) => setSessionData(prev => ({ ...prev, isPublic: e.target.value === 'public' }))}
                  className="w-full p-3 spell-input rounded-lg text-amber-50"
                  disabled={loading || isLoading}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            {!sessionData.isPublic && (
              <div>
                <label className="block text-amber-300 text-sm font-medium mb-2">
                  Session Password
                </label>
                <input
                  type="password"
                  value={sessionData.password}
                  onChange={(e) => setSessionData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password for private session"
                  className="w-full p-3 spell-input rounded-lg text-amber-50"
                  disabled={loading || isLoading}
                />
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={() => setStep(2)}
                disabled={!sessionData.name.trim() || loading || isLoading}
                className="rune-button px-8 py-3 rounded-lg font-bold text-black disabled:opacity-50"
              >
                Next: Game Mode
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Game Mode Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="fantasy-title text-xl text-amber-300 text-center mb-6">
              Choose Game Mode
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GAME_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSessionData(prev => ({ ...prev, gameMode: mode.id }))}
                  className={`p-6 border-2 rounded-lg text-left transition-all duration-300 hover:scale-105 ${
                    sessionData.gameMode === mode.id
                      ? 'border-amber-400 bg-amber-900/30 shadow-lg shadow-amber-400/30'
                      : 'border-amber-600/30 hover:border-amber-500 hover:bg-amber-900/10'
                  }`}
                  disabled={loading || isLoading}
                >
                  <div className="text-3xl mb-3 text-center">{mode.icon}</div>
                  <h4 className="fantasy-title text-lg text-amber-300 mb-2 text-center">{mode.name}</h4>
                  <p className="text-amber-200 text-sm leading-relaxed text-center">{mode.description}</p>
                  
                  {/* Quick settings preview */}
                  <div className="mt-4 pt-3 border-t border-amber-600/30">
                    <div className="text-xs text-amber-400 space-y-1">
                      <div>Turn Limit: {mode.settings.turn_time_limit || 'None'} {mode.settings.turn_time_limit ? 'min' : ''}</div>
                      <div>Voice: {mode.settings.voice_enabled ? 'Yes' : 'No'}</div>
                      <div>Observers: {mode.settings.allow_observers ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 border border-amber-600 rounded-lg text-amber-200 transition-colors"
                disabled={loading || isLoading}
              >
                Back
              </button>
              <button
                onClick={() => setStep(sessionData.gameMode === 'custom' ? 3 : 3)}
                className="rune-button px-8 py-3 rounded-lg font-bold text-black"
                disabled={loading || isLoading}
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Custom Settings (if custom mode) or Review */}
        {step === 3 && sessionData.gameMode === 'custom' && (
          <div className="space-y-6">
            <h3 className="fantasy-title text-xl text-amber-300 text-center mb-6">
              Custom Game Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-amber-300 text-sm font-medium mb-2">
                  Turn Time Limit (minutes)
                </label>
                <select
                  value={customSettings.turn_time_limit}
                  onChange={(e) => setCustomSettings(prev => ({ ...prev, turn_time_limit: parseInt(e.target.value) }))}
                  className="w-full p-3 spell-input rounded-lg text-amber-50"
                  disabled={loading || isLoading}
                >
                  <option value={0}>No limit</option>
                  <option value={1}>1 minute</option>
                  <option value={2}>2 minutes</option>
                  <option value={3}>3 minutes</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={customSettings.auto_advance_turns}
                  onChange={(e) => setCustomSettings(prev => ({ ...prev, auto_advance_turns: e.target.checked }))}
                  className="rounded border-amber-600 bg-gray-800 text-amber-600 focus:ring-amber-500"
                  disabled={loading || isLoading}
                />
                <span className="text-amber-300">Auto-advance turns when time expires</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={customSettings.allow_observers}
                  onChange={(e) => setCustomSettings(prev => ({ ...prev, allow_observers: e.target.checked }))}
                  className="rounded border-amber-600 bg-gray-800 text-amber-600 focus:ring-amber-500"
                  disabled={loading || isLoading}
                />
                <span className="text-amber-300">Allow observers to watch the session</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={customSettings.voice_enabled}
                  onChange={(e) => setCustomSettings(prev => ({ ...prev, voice_enabled: e.target.checked }))}
                  className="rounded border-amber-600 bg-gray-800 text-amber-600 focus:ring-amber-500"
                  disabled={loading || isLoading}
                />
                <span className="text-amber-300">Enable voice narration</span>
              </label>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 border border-amber-600 rounded-lg text-amber-200 transition-colors"
                disabled={loading || isLoading}
              >
                Back
              </button>
              <button
                onClick={handleCreateSession}
                disabled={loading || isLoading}
                className="rune-button px-8 py-3 rounded-lg font-bold text-black disabled:opacity-50 flex items-center space-x-2"
              >
                {loading || isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Create Session</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Create (for non-custom modes) */}
        {step === 3 && sessionData.gameMode !== 'custom' && (
          <div className="space-y-6">
            <h3 className="fantasy-title text-xl text-amber-300 text-center mb-6">
              Review Session
            </h3>

            <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-amber-300 font-bold mb-3">Session Info</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-amber-200">Name: <span className="text-amber-100">{sessionData.name}</span></p>
                    <p className="text-amber-200">Max Players: <span className="text-amber-100">{sessionData.maxPlayers}</span></p>
                    <p className="text-amber-200">Visibility: <span className="text-amber-100">{sessionData.isPublic ? 'Public' : 'Private'}</span></p>
                    <p className="text-amber-200">Game Mode: <span className="text-amber-100">{selectedMode.name}</span></p>
                    {sessionData.description && (
                      <p className="text-amber-200">Description: <span className="text-amber-100">{sessionData.description}</span></p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-amber-300 font-bold mb-3">Game Settings</h4>
                  <div className="space-y-2 text-sm">
                    {(() => {
                      const settings = selectedMode.settings;
                      return (
                        <>
                          <p className="text-amber-200">Turn Limit: <span className="text-amber-100">{settings.turn_time_limit || 'No limit'} {settings.turn_time_limit ? 'min' : ''}</span></p>
                          <p className="text-amber-200">Auto-advance: <span className="text-amber-100">{settings.auto_advance_turns ? 'Yes' : 'No'}</span></p>
                          <p className="text-amber-200">Observers: <span className="text-amber-100">{settings.allow_observers ? 'Allowed' : 'Not allowed'}</span></p>
                          <p className="text-amber-200">Voice: <span className="text-amber-100">{settings.voice_enabled ? 'Enabled' : 'Disabled'}</span></p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
                <p className="text-red-200">{error}</p>
              </div>
            )}

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 border border-amber-600 rounded-lg text-amber-200 transition-colors"
                disabled={loading || isLoading}
              >
                Back
              </button>
              <button
                onClick={handleCreateSession}
                disabled={loading || isLoading}
                className="rune-button px-8 py-3 rounded-lg font-bold text-black disabled:opacity-50 flex items-center space-x-2"
              >
                {loading || isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Create Session</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}