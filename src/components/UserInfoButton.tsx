import React, { useState, useEffect } from 'react';
import { User, LogIn, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from './UserProfile';
import { AuthModal } from './Auth/AuthModal';

export function UserInfoButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get user profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
          
        setUser({
          ...user,
          ...profile
        });
        
        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    };
    
    getUser();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Get user profile
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          setUser({
            ...session.user,
            ...profile
          });
          
          if (profile?.avatar_url) {
            setAvatarUrl(profile.avatar_url);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setAvatarUrl(null);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      setShowAuthModal(false);
    } catch (err) {
      console.error('Sign in error:', err);
      setAuthError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string, username: string) => {
    setAuthLoading(true);
    setAuthError(null);
    
    try {
      // Check if username is already taken
      const { data: existingUsers } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle();
        
      if (existingUsers) {
        throw new Error('Username is already taken');
      }
      
      // Sign up
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: username
          }
        }
      });
      
      if (error) throw error;
      
      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            username,
            display_name: username
          });
          
        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }
      
      setShowAuthModal(false);
    } catch (err) {
      console.error('Sign up error:', err);
      setAuthError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setShowProfile(false);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <>
      <button
        onClick={() => user ? setShowProfile(true) : setShowAuthModal(true)}
        className="p-3 border-2 border-amber-600/30 rounded-lg hover:border-amber-500 hover:bg-amber-900/20 transition-all duration-300 group hover:scale-105 flex items-center space-x-2"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        ) : user ? (
          <>
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={user.username} 
                className="w-6 h-6 rounded-full object-cover border border-amber-400"
              />
            ) : (
              <User className="w-5 h-5 text-amber-400" />
            )}
            <div className="text-left">
              <div className="text-amber-300 font-medium">{user.display_name || user.username}</div>
              <div className="text-xs text-amber-400">View Profile</div>
            </div>
          </>
        ) : (
          <>
            <LogIn className="w-5 h-5 text-amber-400" />
            <div className="text-left">
              <div className="text-amber-300 font-medium">Guest</div>
              <div className="text-xs text-amber-400">Sign In</div>
            </div>
          </>
        )}
      </button>
      
      {showProfile && user && (
        <UserProfile
          onClose={() => setShowProfile(false)}
          onSignOut={handleSignOut}
        />
      )}
      
      {showAuthModal && !user && (
        <AuthModal
          isOpen={true}
          onClose={() => setShowAuthModal(false)}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onSignInWithGoogle={async () => {}}
          loading={authLoading}
          error={authError}
        />
      )}
    </>
  );
}