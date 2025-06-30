import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Pause, Play, Loader } from 'lucide-react';

interface VoicePlayerProps {
  voiceUrl: string;
  isLoading?: boolean;
  autoPlay?: boolean;
  onToggle?: (isPlaying: boolean) => void;
}

export function VoicePlayer({ voiceUrl, isLoading = false, autoPlay = false, onToggle }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create or update audio element when URL changes
  useEffect(() => {
    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    // Reset state
    setIsReady(false);
    setIsPlaying(false);
    setError(null);

    if (!voiceUrl) {
      return;
    }

    // Create new audio element
    const audio = new Audio(voiceUrl);
    audioRef.current = audio;

    // Set up event listeners
    const handleCanPlay = () => {
      setIsReady(true);
      if (autoPlay) {
        loadTimeoutRef.current = setTimeout(() => {
          playAudio();
        }, 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onToggle) onToggle(false);
    };

    const handleError = (e: Event) => {
      // Only log error if it's a genuine loading failure
      const target = e.target as HTMLAudioElement;
      if (target && target.error && target.error.code !== 0) {
        console.error('Audio loading failed:', target.error);
        setError('Failed to load audio');
        setIsPlaying(false);
        setIsReady(false);
        if (onToggle) onToggle(false);
      }
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      // Clean up
      if (audio) {
        audio.pause();
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      }
      
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [voiceUrl, autoPlay, onToggle]);

  // Play audio function
  const playAudio = () => {
    if (!audioRef.current || !isReady) return;

    const playPromise = audioRef.current.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          if (onToggle) onToggle(true);
        })
        .catch(err => {
          // Only log if it's not a user interaction issue
          if (err.name !== 'NotAllowedError') {
            console.error('Audio playback failed:', err);
            setError('Playback failed');
          }
          setIsPlaying(false);
          if (onToggle) onToggle(false);
        });
    }
  };

  // Pause audio function
  const pauseAudio = () => {
    if (!audioRef.current) return;

    try {
      audioRef.current.pause();
      setIsPlaying(false);
      if (onToggle) onToggle(false);
    } catch (err) {
      console.error('Error pausing audio:', err);
    }
  };

  // Toggle play/pause
  const togglePlayback = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  // Determine which icon to show
  const getIcon = () => {
    if (isLoading) return <Loader className="w-4 h-4 animate-spin" />;
    if (error) return <VolumeX className="w-4 h-4 text-red-400" />;
    if (isPlaying) return <Pause className="w-4 h-4" />;
    return <Play className="w-4 h-4" />;
  };

  return (
    <button
      onClick={togglePlayback}
      disabled={isLoading || !!error || !isReady}
      className={`p-1 rounded-full transition-colors ${
        isPlaying
          ? 'bg-amber-600/30 text-amber-300'
          : isReady
          ? 'text-amber-400 hover:bg-amber-900/30 hover:text-amber-300'
          : 'text-amber-600/50 cursor-not-allowed'
      }`}
      title={
        isLoading
          ? 'Loading audio...'
          : error
          ? 'Audio failed to load'
          : isPlaying
          ? 'Pause narration'
          : 'Play narration'
      }
    >
      {getIcon()}
    </button>
  );
}