import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmationModal({ 
  title, 
  message, 
  onConfirm, 
  onCancel,
  isLoading = false
}: ConfirmationModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4 relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center mb-4">
          <div className="p-3 rounded-full bg-red-500/20 mr-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        
        <p className="text-gray-300 mb-6">{message}</p>
        
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors flex items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                Processing...
              </>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}