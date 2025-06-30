import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface ConnectionStatusIndicatorProps {
  isConnected: boolean;
  reconnectAttempts: number;
  onManualReconnect?: () => void;
  className?: string;
}

export function ConnectionStatusIndicator({
  isConnected,
  reconnectAttempts,
  onManualReconnect,
  className = ''
}: ConnectionStatusIndicatorProps) {
  const [visible, setVisible] = useState(false);
  
  // Show indicator when disconnected or when reconnected (briefly)
  useEffect(() => {
    if (!isConnected || reconnectAttempts > 0) {
      setVisible(true);
    } else if (isConnected && reconnectAttempts === 0 && visible) {
      // Hide after a delay when reconnected
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, reconnectAttempts, visible]);
  
  // Don't render anything if not visible
  if (!visible) return null;
  
  return (
    <div className={`px-3 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 ${
      isConnected 
        ? 'bg-green-900/80 border border-green-600 text-green-200 animate-fadeIn'
        : 'bg-red-900/80 border border-red-600 text-red-200 animate-pulse'
    } ${className}`}>
      {isConnected ? (
        <>
          <Wifi className="w-4 h-4 text-green-400" />
          <span className="text-sm">Connection restored</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-400" />
          <span className="text-sm">Connection lost {reconnectAttempts > 0 ? `(Attempt ${reconnectAttempts}/5)` : ''}</span>
        </>
      )}
      
      {!isConnected && onManualReconnect && (
        <button
          onClick={onManualReconnect}
          className="ml-2 p-1 bg-red-700 hover:bg-red-600 rounded text-white text-xs flex items-center"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}