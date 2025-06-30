import React, { useEffect, useState } from 'react';

interface Ember {
  id: number;
  left: number;
  delay: number;
  size: number;
  speed: number;
}

export function FloatingEmbers() {
  const [embers, setEmbers] = useState<Ember[]>([]);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const emberCount = 20;
    const newEmbers: Ember[] = [];

    for (let i = 0; i < emberCount; i++) {
      newEmbers.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 12,
        size: Math.random() * 3 + 2,
        speed: Math.random() * 0.5 + 0.5,
      });
    }

    setEmbers(newEmbers);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="floating-embers">
      {embers.map((ember) => (
        <div
          key={ember.id}
          className="ember"
          style={{
            left: `${ember.left}%`,
            animationDelay: `${ember.delay}s`,
            animationDuration: `${8 / ember.speed}s`,
            width: `${ember.size}px`,
            height: `${ember.size}px`,
            transform: `translateY(${scrollY * ember.speed * 0.1}px)`,
          }}
        />
      ))}
    </div>
  );
}