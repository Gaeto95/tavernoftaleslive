import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X, Sparkles } from 'lucide-react';

interface Notification {
  id: string;
  message: string;
  type: string; // 'success', 'warning', 'danger', 'info', 'special'
}

interface NotificationSystemProps {
  notifications: Notification[];
}

export function NotificationSystem({ notifications }: NotificationSystemProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

  // Update visible notifications when the prop changes
  useEffect(() => {
    setVisibleNotifications(notifications);
  }, [notifications]);

  // Remove a notification
  const removeNotification = (id: string) => {
    setVisibleNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Get icon based on notification type
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'danger':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
      case 'special':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      default:
        return <Info className="w-5 h-5 text-amber-400" />;
    }
  };

  // Get background color based on notification type
  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-900/80 border-green-600';
      case 'warning':
        return 'bg-yellow-900/80 border-yellow-600';
      case 'danger':
        return 'bg-red-900/80 border-red-600';
      case 'info':
        return 'bg-blue-900/80 border-blue-600';
      case 'special':
        return 'bg-purple-900/80 border-purple-600';
      default:
        return 'bg-amber-900/80 border-amber-600';
    }
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-xs w-full">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getBackgroundColor(notification.type)} border rounded-lg p-3 shadow-lg backdrop-blur-sm transform transition-all duration-300 animate-slideIn`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-2">
              {getIcon(notification.type)}
            </div>
            <div className="flex-1 mr-2">
              <p className="text-white text-sm">{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      <style>
        {`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }
        `}
      </style>
    </div>
  );
}