import React from 'react';
import { Shield, Home, LogOut, RefreshCw } from 'lucide-react';

interface AdminHeaderProps {
  onBackToHome?: () => void;
  onSignOut: () => void;
  onRefresh: () => void;
}

export function AdminHeader({ onBackToHome, onSignOut, onRefresh }: AdminHeaderProps) {
  return (
    <header className="bg-gray-800 border-b border-gray-700 py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <Shield className="w-8 h-8 text-amber-500 mr-3" />
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={onRefresh}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors flex items-center"
            >
              <Home className="w-4 h-4 mr-2" />
              <span>Home</span>
            </button>
          )}
          
          <button
            onClick={onSignOut}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors flex items-center"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}