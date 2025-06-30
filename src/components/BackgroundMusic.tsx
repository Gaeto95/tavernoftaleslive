import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Volume as VolumeOff } from 'lucide-react';

interface BackgroundMusicProps {
  volume?: number;
  autoPlay?: boolean;
}

export function BackgroundMusic({ volume = 0.07, autoPlay = true }: BackgroundMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    // Get saved mute state from localStorage or use default
    const savedMuteState = localStorage.getItem('background-music-muted');
    return savedMuteState === 'true';
  });
  const [currentVolume, setCurrentVolume] = useState(() => {
    // Get saved volume from localStorage or use default
    const savedVolume = localStorage.getItem('background-music-volume');
    return savedVolume ? parseFloat(savedVolume) : volume;
  });
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Set volume
    audio.volume = currentVolume;
    audio.loop = true;

    const handleCanPlay = () => {
      if (autoPlay && hasUserInteracted && !isPlaying && !isMuted) {
        playMusic();
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      console.warn('Background music failed to load:', e);
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [currentVolume, autoPlay, hasUserInteracted, isPlaying, isMuted]);

  // Handle user interaction requirement for autoplay
  useEffect(() => {
    const handleFirstInteraction = () => {
      setHasUserInteracted(true);
      if (autoPlay && !isPlaying && !isMuted && audioRef.current) {
        playMusic();
      }
    };

    // Listen for any user interaction
    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('keydown', handleFirstInteraction, { once: true });
    document.addEventListener('touchstart', handleFirstInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [autoPlay, isPlaying, isMuted]);

  const playMusic = async () => {
    const audio = audioRef.current;
    if (!audio || isMuted) return;

    try {
      await audio.play();
    } catch (error) {
      console.warn('Could not play background music:', error);
    }
  };

  const pauseMusic = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
  };

  const toggleMusic = () => {
    if (isPlaying) {
      pauseMusic();
    } else {
      playMusic();
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (audio) {
      const newMutedState = !isMuted;
      audio.muted = newMutedState;
      setIsMuted(newMutedState);
      
      // Save mute state to localStorage
      localStorage.setItem('background-music-muted', newMutedState.toString());
      
      if (!newMutedState && !isPlaying) {
        playMusic();
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setCurrentVolume(newVolume);
    
    // Save volume to localStorage
    localStorage.setItem('background-music-volume', newVolume.toString());
    
    const audio = audioRef.current;
    if (audio) {
      audio.volume = newVolume;
    }
  };

  const getVolumeIcon = () => {
    if (isMuted || currentVolume === 0) return VolumeX;
    if (currentVolume < 0.5) return VolumeOff;
    return Volume2;
  };

  const VolumeIcon = getVolumeIcon();

  return (
    <>
      <audio
        ref={audioRef}
        src="/background.mp3"
        preload="auto"
        muted={isMuted}
      />
      
      {/* Music Controls - COMPLETELY FIXED: No orange background bleed */}
      <div 
        className="fixed bottom-4 left-4 z-50 flex items-center space-x-3 px-4 py-2 shadow-lg"
        style={{
          background: 'rgba(69, 39, 19, 0.95)', // Dark brown background - NO AMBER
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(251, 191, 36, 0.4)',
          borderRadius: '9999px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          isolation: 'isolate' // Prevent background bleed
        }}
      >
        {/* Play/Pause Button */}
        <button
          onClick={toggleMusic}
          className="p-2 hover:bg-amber-800/30 rounded-full text-amber-300 hover:text-amber-200 transition-all duration-200"
          title={isPlaying ? 'Pause background music' : 'Play background music'}
        >
          {isPlaying ? (
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-1 h-3 bg-current mr-0.5"></div>
              <div className="w-1 h-3 bg-current"></div>
            </div>
          ) : (
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[5px] border-l-current border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent ml-0.5"></div>
            </div>
          )}
        </button>
        
        {/* Volume Slider */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className="p-1 hover:bg-amber-800/30 rounded text-amber-300 hover:text-amber-200 transition-all duration-200"
            title={isMuted ? 'Unmute background music' : 'Mute background music'}
          >
            <VolumeIcon className="w-4 h-4" />
          </button>
          
          <input
            type="range"
            min="0"
            max="0.3"
            step="0.01"
            value={currentVolume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-amber-700 rounded-lg appearance-none cursor-pointer slider"
            title="Adjust volume"
          />
          
          <span className="text-xs text-amber-300 font-medium min-w-[2rem] text-center">
            {Math.round(currentVolume * 100)}%
          </span>
        </div>
      </div>

      {/* CSS Styles - moved to regular CSS instead of JSX */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 12px;
            width: 12px;
            border-radius: 50%;
            background: #fbbf24;
            cursor: pointer;
            border: 2px solid #92400e;
          }
          
          .slider::-moz-range-thumb {
            height: 12px;
            width: 12px;
            border-radius: 50%;
            background: #fbbf24;
            cursor: pointer;
            border: 2px solid #92400e;
          }
        `
      }} />
    </>
  );
}