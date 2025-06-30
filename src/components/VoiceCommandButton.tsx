import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader } from 'lucide-react';

interface VoiceCommandButtonProps {
  onVoiceInput: (text: string) => void;
  disabled?: boolean;
}

export function VoiceCommandButton({ onVoiceInput, disabled }: VoiceCommandButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      
      // Create recognition instance
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('Voice recognition started');
        setIsListening(true);
        setError(null);
        
        // Set a timeout to stop listening after 10 seconds
        timeoutRef.current = setTimeout(() => {
          recognition.stop();
        }, 10000);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Voice input received:', transcript);
        
        if (transcript.trim()) {
          onVoiceInput(transcript.trim());
        }
        
        setIsListening(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Voice recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone access and try again.');
        } else if (event.error === 'no-speech') {
          setError('No speech detected. Please try again.');
        } else if (event.error === 'network') {
          setError('Network error. Please check your connection.');
        } else {
          setError('Voice recognition failed. Please try again.');
        }
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
      
      recognition.onend = () => {
        console.log('Voice recognition ended');
        setIsListening(false);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
      
      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      console.warn('Speech recognition not supported in this browser');
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onVoiceInput]);

  const toggleListening = () => {
    if (!recognitionRef.current || disabled) return;
    
    if (isListening) {
      // Stop listening
      recognitionRef.current.stop();
    } else {
      // Start listening
      setError(null);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start voice recognition:', err);
        setError('Failed to start voice recognition. Please try again.');
      }
    }
  };

  if (!isSupported) {
    return (
      <button
        disabled
        className="p-2 text-gray-500 cursor-not-allowed"
        title="Voice commands not supported in this browser"
      >
        <MicOff className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={toggleListening}
        disabled={disabled}
        className={`p-2 rounded-lg transition-all duration-200 ${
          disabled
            ? 'text-gray-500 cursor-not-allowed'
            : isListening
            ? 'text-red-400 bg-red-900/20 animate-pulse'
            : 'text-amber-400 hover:text-amber-300 hover:bg-amber-900/20'
        }`}
        title={
          isListening 
            ? 'Stop listening (click or wait for silence)' 
            : 'Click to speak your action'
        }
      >
        {isListening ? (
          <Loader className="w-5 h-5 animate-spin" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
      
      {error && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-red-900/90 text-red-200 text-xs rounded-lg whitespace-nowrap z-50">
          {error}
        </div>
      )}
      
      {isListening && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-amber-900/90 text-amber-200 text-xs rounded-lg whitespace-nowrap z-50">
          Listening... Speak your action
        </div>
      )}
    </div>
  );
}