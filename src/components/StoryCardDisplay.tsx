import React, { useState, useEffect } from 'react';
import { X, Sparkles, Eye } from 'lucide-react';
import { StoryCard } from '../types/game';
import { SceneImage } from './SceneImage';
import { playUIClick, playSoundEffect } from '../utils/soundEffects';
import './StoryCardDisplay.css';

interface StoryCardDisplayProps {
  card: StoryCard;
  onClose: () => void;
  onReveal?: () => void;
  isRevealing?: boolean;
}

export function StoryCardDisplay({ card, onClose, onReveal, isRevealing = false }: StoryCardDisplayProps) {
  const [isFlipped, setIsFlipped] = useState(!card.isRevealed);
  const [isRevealed, setIsRevealed] = useState(card.isRevealed);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const [cardImageUrl, setCardImageUrl] = useState<string | undefined>(card.imageUrl);

  // Handle card reveal animation
  useEffect(() => {
    if (isRevealing && !isRevealed) {
      setIsAnimating(true);
      // Play card reveal sound
      playSoundEffect('item', 'discover');
      
      const timer = setTimeout(() => {
        setIsFlipped(false);
        setTimeout(() => {
          setIsRevealed(true);
          setShowGlow(true);
          setIsAnimating(false);
          if (onReveal) onReveal();
          
          // Play reveal completion sound
          playSoundEffect('quest', 'discover');
          
          // Fade out glow effect after 2 seconds
          setTimeout(() => {
            setShowGlow(false);
          }, 2000);
        }, 1000);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isRevealing, isRevealed, onReveal]);

  // Set default card image based on type if none provided
  useEffect(() => {
    if (!card.imageUrl) {
      // Default images based on card type
      const defaultImages = {
        event: 'https://images.pexels.com/photos/1252869/pexels-photo-1252869.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // lightning
        character: 'https://images.pexels.com/photos/6492956/pexels-photo-6492956.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // hooded figure
        item: 'https://images.pexels.com/photos/6044226/pexels-photo-6044226.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // treasure
        location: 'https://images.pexels.com/photos/6650184/pexels-photo-6650184.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // castle
        twist: 'https://images.pexels.com/photos/3329718/pexels-photo-3329718.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', // portal
      };
      
      setCardImageUrl(defaultImages[card.type as keyof typeof defaultImages]);
    }
  }, [card]);

  const handleCardClick = () => {
    if (!isRevealed && !isAnimating) {
      setIsAnimating(true);
      // Play card flip sound
      playSoundEffect('item', 'discover');
      
      setIsFlipped(false);
      setTimeout(() => {
        setIsRevealed(true);
        setShowGlow(true);
        setIsAnimating(false);
        if (onReveal) onReveal();
        
        // Play reveal completion sound
        playSoundEffect('quest', 'discover');
        
        // Fade out glow effect after 2 seconds
        setTimeout(() => {
          setShowGlow(false);
        }, 2000);
      }, 1000);
    }
  };

  const handleCloseClick = () => {
    playUIClick();
    onClose();
  };

  const getCardTypeColor = () => {
    switch (card.type) {
      case 'event': return 'card-type-event';
      case 'character': return 'card-type-character';
      case 'item': return 'card-type-item';
      case 'location': return 'card-type-location';
      case 'twist': return 'card-type-twist';
      default: return '';
    }
  };

  const getCardTypeIcon = () => {
    switch (card.type) {
      case 'event': return '⚡';
      case 'character': return '👤';
      case 'item': return '🏆';
      case 'location': return '🗺️';
      case 'twist': return '✨';
      default: return '❓';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-md w-full mx-4">
        {/* Close Button */}
        <button
          onClick={handleCloseClick}
          className="absolute -top-4 -right-4 z-10 bg-black/80 backdrop-blur-sm border border-amber-600/50 rounded-full p-2 text-amber-300 hover:text-amber-200 transition-colors shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Card Container */}
        <div 
          className={`perspective-card ${isAnimating ? 'pointer-events-none' : ''}`}
          onClick={isFlipped ? handleCardClick : undefined}
        >
          {/* Card Front (Revealed) */}
          <div 
            className={`card-face card-front ${isFlipped ? 'card-flipped' : ''} 
                        ${getCardTypeColor()} 
                        border-2 rounded-2xl overflow-hidden shadow-2xl relative`}
          >
            {/* Magical glow effect when revealed */}
            {showGlow && (
              <div className="absolute inset-0 bg-white/20 animate-pulse z-10 pointer-events-none"></div>
            )}
            
            {/* Card Image */}
            <div className="h-48 relative">
              {cardImageUrl ? (
                <img 
                  src={cardImageUrl} 
                  alt={card.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <div className="text-6xl">{getCardTypeIcon()}</div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
            </div>

            {/* Card Content */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="fantasy-title text-xl font-bold text-white">{card.name}</h3>
                <span className="text-sm px-2 py-1 rounded-full bg-black/30 text-white capitalize flex items-center">
                  {getCardTypeIcon()} <span className="ml-1">{card.type}</span>
                </span>
              </div>
              
              <p className="text-white/90 text-sm mb-4">{card.description}</p>
              
              <div className="bg-black/30 p-3 rounded-lg">
                <h4 className="text-white/90 text-sm font-bold mb-1">Effect:</h4>
                <p className="text-white/80 text-sm">{card.effect}</p>
              </div>
            </div>
            
            {/* Card type indicator */}
            <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
              <span className="text-xs font-bold" style={{ color: getCardTypeTextColor(card.type) }}>
                {card.type.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Card Back (Unrevealed) */}
          <div className={`card-face card-back ${isFlipped ? '' : 'card-flipped'} 
                          bg-gradient-to-b from-amber-900 to-amber-800 
                          border-2 border-amber-600 rounded-2xl overflow-hidden shadow-2xl`}>
            <div className="h-full flex flex-col items-center justify-center p-8 relative">
              {/* Animated magical elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-amber-300 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                <div className="absolute top-3/4 right-1/3 w-2 h-2 bg-amber-400 rounded-full animate-ping" style={{ animationDuration: '2.3s' }}></div>
                <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-amber-500 rounded-full animate-ping" style={{ animationDuration: '2.7s' }}></div>
              </div>
              
              {/* Card back design */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 border-4 border-amber-500/50 rounded-full flex items-center justify-center">
                  <div className="w-24 h-24 border-4 border-amber-600/50 rounded-full flex items-center justify-center">
                    <div className="w-16 h-16 bg-amber-700/50 rounded-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-amber-300 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Card back text */}
              <div className="relative z-10 text-center mt-40">
                <h3 className="fantasy-title text-2xl font-bold text-amber-300 mb-2 text-center">
                  Mysterious Card
                </h3>
                <p className="text-amber-200 text-center">
                  Click to reveal this story card and discover how it affects your adventure...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get text color based on card type
function getCardTypeTextColor(type: string): string {
  switch (type) {
    case 'event': return '#FCA5A5'; // red-300
    case 'character': return '#93C5FD'; // blue-300
    case 'item': return '#D8B4FE'; // purple-300
    case 'location': return '#86EFAC'; // green-300
    case 'twist': return '#FCD34D'; // amber-300
    default: return '#D1D5DB'; // gray-300
  }
}