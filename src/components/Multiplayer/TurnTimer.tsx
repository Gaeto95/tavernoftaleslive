import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TurnTimerProps {
  deadline: Date;
}

export function TurnTimer({ deadline }: TurnTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isUrgent, setIsUrgent] = useState(false);
  const [progress, setProgress] = useState(100);
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    const now = new Date().getTime();
    const deadlineTime = deadline.getTime();
    const initialTimeLeft = Math.max(0, deadlineTime - now);
    
    // Store the initial total duration for progress calculation
    setTotalDuration(initialTimeLeft);
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const deadlineTime = deadline.getTime();
      const remaining = Math.max(0, deadlineTime - now);
      
      setTimeLeft(remaining);
      setIsUrgent(remaining < 60000); // Less than 1 minute
      
      // Calculate progress percentage
      if (totalDuration > 0) {
        const progressPercent = (remaining / totalDuration) * 100;
        setProgress(progressPercent);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deadline, totalDuration]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (timeLeft <= 0) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-red-600/20 border border-red-600 rounded-lg text-red-300">
        <AlertTriangle className="w-4 h-4" />
        <span className="font-medium">Time's Up!</span>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors ${
      isUrgent 
        ? 'bg-red-600/20 border-red-600 text-red-300' 
        : 'bg-amber-600/20 border-amber-600 text-amber-300'
    }`}>
      {/* Progress bar background */}
      <div className="absolute inset-0 rounded-lg overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${
            isUrgent ? 'bg-red-600/10' : 'bg-amber-600/10'
          }`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex items-center space-x-2">
        <Clock className="w-4 h-4" />
        <span className={`font-medium font-mono ${isUrgent ? 'animate-pulse' : ''}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
    </div>
  );
}