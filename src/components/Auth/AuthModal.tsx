import React, { useState } from 'react';
import { User, Mail, Lock, UserPlus, LogIn, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<any>;
  onSignUp: (email: string, password: string, username: string) => Promise<any>;
  onSignInWithGoogle: () => Promise<any>;
  loading: boolean;
  error: string | null;
}

export function AuthModal({ 
  isOpen, 
  onClose, 
  onSignIn, 
  onSignUp, 
  onSignInWithGoogle,
  loading, 
  error 
}: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'signup') {
      if (password !== confirmPassword) {
        return;
      }
      await onSignUp(email, password, username);
    } else {
      await onSignIn(email, password);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setConfirmPassword('');
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    resetForm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="parchment-panel p-8 max-w-md w-full mx-4 relative">
        {/* Close button - fixed to work properly */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 text-amber-400 hover:text-amber-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            {mode === 'signin' ? (
              <LogIn className="w-8 h-8 text-white" />
            ) : (
              <UserPlus className="w-8 h-8 text-white" />
            )}
          </div>
          <h2 className="fantasy-title text-2xl font-bold text-amber-300 mb-2">
            {mode === 'signin' ? 'Welcome Back, Adventurer' : 'Join the Quest'}
          </h2>
          <p className="text-amber-200">
            {mode === 'signin' 
              ? 'Sign in to continue your epic journey' 
              : 'Create your account to begin your adventure'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-amber-300 text-sm font-medium mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 spell-input rounded-lg text-amber-50"
                  placeholder="Choose your adventurer name"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-amber-300 text-sm font-medium mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 spell-input rounded-lg text-amber-50"
                placeholder="your.email@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-amber-300 text-sm font-medium mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 spell-input rounded-lg text-amber-50"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-amber-300 text-sm font-medium mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 spell-input rounded-lg text-amber-50"
                  placeholder="Confirm your password"
                  required
                />
              </div>
              {password !== confirmPassword && confirmPassword && (
                <p className="text-red-400 text-sm mt-1">Passwords do not match</p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-600 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'signup' && password !== confirmPassword)}
            className="w-full rune-button px-6 py-3 rounded-lg font-bold text-black disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                {mode === 'signin' ? 'Signing In...' : 'Creating Account...'}
              </div>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-amber-300">
            {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
          </p>
          <button
            onClick={switchMode}
            className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            {mode === 'signin' ? 'Create one here' : 'Sign in instead'}
          </button>
        </div>

        {/* Future Google OAuth - Coming Soon */}
        <div className="mt-4 pt-4 border-t border-amber-600/30 text-center">
          <p className="text-amber-400 text-xs">
            🚀 Google Sign-In coming soon!
          </p>
        </div>
      </div>
    </div>
  );
}