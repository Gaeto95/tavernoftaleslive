import React, { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number; // milliseconds per character
  onComplete?: () => void;
  onProgress?: () => void; // Called during typing for scroll updates
  startDelay?: number; // Delay before starting to type
}

export function TypewriterText({ 
  text, 
  speed = 30, // Reduced from 50 to 30 for faster typing
  onComplete, 
  onProgress,
  startDelay = 0
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(startDelay === 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTime = useRef<number>(0);

  // Handle start delay
  useEffect(() => {
    if (!hasStarted && startDelay > 0) {
      const timer = setTimeout(() => {
        setHasStarted(true);
      }, startDelay);
      
      return () => clearTimeout(timer);
    }
  }, [hasStarted, startDelay]);

  useEffect(() => {
    if (hasStarted && currentIndex < text.length) {
      // Increase typing speed by reducing the delay
      const typingSpeed = speed * (text[currentIndex] === ' ' ? 0.5 : 1); // Type spaces faster
      
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
        
        // Call progress callback for scroll updates
        if (onProgress) {
          onProgress();
        }
        
        // Improved mobile-friendly auto-scroll with throttling
        const now = Date.now();
        if (now - lastScrollTime.current > 100) { // Reduced from 200ms to 100ms for more responsive scrolling
          lastScrollTime.current = now;
          
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
          }
          
          scrollTimeoutRef.current = setTimeout(() => {
            if (containerRef.current) {
              // Use a more gentle scroll approach for mobile
              const element = containerRef.current;
              const rect = element.getBoundingClientRect();
              const isInView = rect.bottom <= window.innerHeight + 100; // 100px buffer
              
              if (!isInView) {
                // Use smooth scroll with better mobile support
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'end',
                  inline: 'nearest'
                });
              }
            }
          }, 50); // Reduced from 100ms to 50ms for faster scrolling
        }
      }, typingSpeed);

      return () => {
        clearTimeout(timer);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    } else if (currentIndex === text.length && onComplete && hasStarted) {
      // Delay completion to ensure final scroll
      setTimeout(() => {
        onComplete();
      }, 100); // Reduced from 300ms to 100ms
    }
  }, [currentIndex, text, speed, onComplete, onProgress, hasStarted]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setHasStarted(startDelay === 0);
    lastScrollTime.current = 0;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  }, [text, startDelay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="typewriter-container">
      {displayedText.split('\n').map((paragraph, pIndex) => (
        <p key={`para-${pIndex}`} className="mb-2 last:mb-0 leading-relaxed text-sm">
          {paragraph}
          {pIndex === displayedText.split('\n').length - 1 && currentIndex < text.length && hasStarted && (
            <span className="typewriter-cursor animate-pulse">|</span>
          )}
        </p>
      ))}
    </div>
  );
}