import React, { useState, useEffect } from 'react';
import { Image, Loader, Eye } from 'lucide-react';

interface SceneImageProps {
  imageUrl?: string;
  isLoading?: boolean;
  alt?: string;
  onLoad?: () => void;
}

export function SceneImage({ imageUrl, isLoading, alt = 'Adventure scene', onLoad }: SceneImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    console.log('Image failed to load:', imageUrl);
    setImageError(true);
    setImageLoaded(false);
  };

  const handleImageLoad = () => {
    console.log('Image loaded successfully:', imageUrl);
    setImageError(false);
    setImageLoaded(true);
    if (onLoad) onLoad();
  };

  // Reset states when imageUrl changes
  useEffect(() => {
    if (imageUrl) {
      setImageError(false);
      setImageLoaded(false);
    }
  }, [imageUrl]);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-gray-900 border border-amber-600 rounded-lg flex items-center justify-center overflow-hidden relative">
        <div className="text-center z-10">
          <Loader className="w-6 h-6 text-amber-400 animate-spin mx-auto mb-1" />
          <p className="text-amber-300 text-xs">Conjuring vision...</p>
        </div>
        {/* Simple loading shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-600/20 to-transparent animate-shimmer" />
      </div>
    );
  }

  if (!imageUrl || imageError) {
    return (
      <div className="w-full h-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border border-amber-600 rounded-lg flex items-center justify-center relative overflow-hidden">
        <div className="text-center z-10">
          <Eye className="w-8 h-8 text-amber-600 mx-auto mb-1 opacity-50" />
          <p className="text-amber-300 text-xs">The mystical visions are unclear...</p>
        </div>
        {/* Subtle animated background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-amber-400 rounded-full animate-pulse" />
          <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-amber-300 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Main Image Container */}
      <div className={`h-full transition-all duration-300 ${
        imageLoaded ? 'opacity-100' : 'opacity-0'
      }`}>
        <img
          src={imageUrl}
          alt={alt}
          onError={handleImageError}
          onLoad={handleImageLoad}
          className="w-full h-full object-cover border border-amber-600 rounded-lg shadow-xl"
          style={{ 
            display: imageLoaded ? 'block' : 'none',
            aspectRatio: 'auto',
            objectFit: 'cover',
            objectPosition: 'center'
          }}
        />
        
        {/* Enhanced magical overlay effects */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-amber-600/10 rounded-lg pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-amber-600/5 rounded-lg pointer-events-none" />
        
        {/* Glassmorphism border effect */}
        <div className="absolute inset-0 rounded-lg border border-amber-400/20 backdrop-blur-[1px] pointer-events-none" />
      </div>
      
      {/* Loading Placeholder - Only show when image hasn't loaded yet and we have a URL */}
      {imageUrl && !imageLoaded && !imageError && (
        <div className="absolute inset-0 w-full h-full bg-gray-900 border border-amber-600 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Eye className="w-6 h-6 text-amber-400 mx-auto mb-1 animate-pulse" />
            <p className="text-amber-300 text-xs">Loading vision...</p>
          </div>
        </div>
      )}
    </div>
  );
}