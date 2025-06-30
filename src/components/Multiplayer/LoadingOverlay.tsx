import React from 'react';
import { Loader, Wifi, WifiOff } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
  isReconnecting?: boolean;
  reconnectAttempt?: number;
}

export function LoadingOverlay({ 
  isVisible, 
  message = 'Loading...', 
  progress,
  isReconnecting = false,
  reconnectAttempt = 0
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-center p-8 bg-gray-900/80 border border-amber-600/50 rounded-lg max-w-md">
        <div className="relative mb-6">
          {isReconnecting ? (
            <div className="flex items-center justify-center">
              <div className="relative">
                <WifiOff className="w-16 h-16 text-red-400 animate-pulse" />
                <div className="absolute -top-2 -right-2">
                  <Wifi className="w-8 h-8 text-green-400 animate-pulse" />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-16 h-16 border-4 border-amber-600/30 border-t-amber-400 rounded-full animate-spin mx-auto"></div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-amber-400/20 rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <h3 className="fantasy-title text-xl text-amber-300 mb-2">
          {isReconnecting ? `Reconnecting (Attempt ${reconnectAttempt}/5)...` : message}
        </h3>
        
        {progress !== undefined && (
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
        
        <p className="text-amber-200 text-sm">
          {isReconnecting 
            ? "Connection lost. Attempting to reconnect to the session..."
            : "The storyteller weaves the next chapter of your adventure..."}
        </p>
        
        {isReconnecting && (
          <p className="text-amber-400 text-xs mt-4">
            If reconnection fails, try refreshing the page
          </p>
        )}
        
        <div className="mt-4 flex justify-center space-x-2">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}