import React, { useState, useEffect } from 'react';
import { Eye, X, Loader } from 'lucide-react';

interface SceneImageModalProps {
  isOpen: boolean;
  imageUrl?: string;
  isLoading?: boolean;
  onClose: () => void;
  autoShow?: boolean;
}

export function SceneImageModal({ 
  isOpen, 
  imageUrl, 
  isLoading, 
  onClose, 
  autoShow = false 
}: SceneImageModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  // Auto-show modal when image starts loading or is ready
  useEffect(() => {
    if (autoShow && (isLoading || imageUrl)) {
      setShowModal(true);
    }
  }, [autoShow, isLoading, imageUrl]);

  // Reset image loaded state when URL changes
  useEffect(() => {
    if (imageUrl) {
      setImageLoaded(false);
      setLoadProgress(10);
      
      // Simulate progress
      const interval = setInterval(() => {
        setLoadProgress(prev => {
          const newProgress = prev + Math.random() * 5;
          return newProgress > 90 ? 90 : newProgress; // Cap at 90% until actual load
        });
      }, 300);
      
      return () => clearInterval(interval);
    }
  }, [imageUrl]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setLoadProgress(100);
  };

  const handleImageError = () => {
    setImageLoaded(false);
    setLoadProgress(0);
  };

  const handleClose = () => {
    setShowModal(false);
    onClose();
  };

  if (!isOpen && !showModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative max-w-4xl w-full max-h-[90vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-amber-600/50 rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 bg-black/80 backdrop-blur-sm border border-amber-600/50 rounded-lg p-2 text-amber-300 hover:text-amber-200 transition-colors shadow-lg"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/40 to-amber-800/40 border-b border-amber-600/50 p-4">
          <h2 className="fantasy-title text-xl font-bold text-amber-300 text-center glow-text">
            Scene Vision
          </h2>
        </div>

        {/* Content */}
        <div className="relative h-96 md:h-[500px] flex items-center justify-center">
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/80 to-gray-800/80 z-10">
              <div className="text-center">
                <div className="relative mb-4">
                  <Eye className="w-16 h-16 text-amber-400 mx-auto animate-pulse" />
                  <div className="absolute inset-0 bg-amber-400/20 rounded-full animate-ping" />
                </div>
                <p className="text-amber-300 text-lg font-medium mb-2">Manifesting Vision...</p>
                <p className="text-amber-400 text-sm">The mystical energies weave your scene</p>
                
                {/* Loading Progress Bar */}
                <div className="mt-4 w-64 h-2 bg-gray-800 rounded-full overflow-hidden mx-auto">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-300 progress-pulse"
                    style={{ width: `${loadProgress}%` }}
                  ></div>
                </div>
                
                {/* Loading Animation */}
                <div className="mt-4 flex justify-center space-x-1">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Image */}
          {imageUrl && (
            <div className={`absolute inset-0 transition-all duration-700 ${
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}>
              <img
                src={imageUrl}
                alt="Scene visualization"
                onLoad={handleImageLoad}
                onError={handleImageError}
                className="w-full h-full object-contain"
                style={{ display: imageLoaded ? 'block' : 'none' }}
              />
              
              {/* Manifesting overlay effect */}
              {!imageLoaded && imageUrl && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent animate-shimmer" />
              )}
              
              {/* Enhanced magical overlay effects */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-amber-600/10 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-amber-600/5 pointer-events-none" />
            </div>
          )}

          {/* No Image State */}
          {!imageUrl && !isLoading && (
            <div className="text-center">
              <Eye className="w-16 h-16 text-amber-600 mx-auto mb-4 opacity-50" />
              <p className="text-amber-400 text-lg">The mystical visions are unclear...</p>
              <p className="text-amber-500 text-sm mt-2">The scrying crystal dims</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-amber-900/40 to-amber-800/40 border-t border-amber-600/50 p-4 text-center">
          <p className="text-amber-300 text-sm">
            {isLoading ? 'Weaving the threads of reality...' : 
             imageLoaded ? 'Your tale comes to life before your eyes' :
             'The vision awaits manifestation'}
          </p>
        </div>
      </div>
    </div>
  );
}