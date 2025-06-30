import React, { useState, useEffect } from 'react';
import { 
  Users, Settings, Database, Shield, User, Sword, 
  Clock, Trash2, Edit, Eye, RefreshCw, LogOut, Home,
  Server, AlertTriangle, CheckCircle, X, Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { SessionsPanel } from './SessionsPanel';
import { PlayersPanel } from './PlayersPanel';
import { CharactersPanel } from './CharactersPanel';
import { SystemPanel } from './SystemPanel';
import { AdminHeader } from './AdminHeader';
import { LoadingOverlay } from '../Multiplayer/LoadingOverlay';

interface AdminDashboardProps {
  onBackToHome?: () => void;
}

export function AdminDashboard({ onBackToHome }: AdminDashboardProps) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'sessions' | 'players' | 'characters' | 'system'>('sessions');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    activeSessions: number;
    totalPlayers: number;
    totalCharacters: number;
    onlinePlayers: number;
  }>({
    activeSessions: 0,
    totalPlayers: 0,
    totalCharacters: 0,
    onlinePlayers: 0
  });

  // Check if current user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        setError('You must be logged in to access the admin dashboard');
        return;
      }

      try {
        setIsLoading(true);
        
        // Check if user has admin role
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        const isUserAdmin = data?.role === 'admin';
        setIsAdmin(isUserAdmin);
        
        if (!isUserAdmin) {
          setError('You do not have permission to access the admin dashboard');
        } else {
          // Load dashboard stats
          await loadDashboardStats();
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify admin permissions');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [user]);

  // Load dashboard statistics
  const loadDashboardStats = async () => {
    try {
      // Get active sessions count
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('game_sessions')
        .select('id', { count: 'exact' })
        .eq('is_active', true);
        
      if (sessionsError) throw sessionsError;
      
      // Get total players count
      const { data: playersData, error: playersError } = await supabase
        .from('users')
        .select('id', { count: 'exact' });
        
      if (playersError) throw playersError;
      
      // Get total characters count
      const { data: charactersData, error: charactersError } = await supabase
        .from('characters')
        .select('id', { count: 'exact' });
        
      if (charactersError) throw charactersError;
      
      // Get online players (active in last 15 minutes)
      const { data: onlineData, error: onlineError } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .gte('last_seen', new Date(Date.now() - 15 * 60 * 1000).toISOString());
        
      if (onlineError) throw onlineError;
      
      setStats({
        activeSessions: sessionsData?.length || 0,
        totalPlayers: playersData?.length || 0,
        totalCharacters: charactersData?.length || 0,
        onlinePlayers: onlineData?.length || 0
      });
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await loadDashboardStats();
      setError(null);
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
      setError('Failed to refresh dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  if (isLoading) {
    return <LoadingOverlay isVisible={true} message="Loading admin dashboard..." />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-300 mb-6 text-center max-w-md">
          {error || 'You do not have permission to access the admin dashboard.'}
        </p>
        <div className="flex space-x-4">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-white transition-colors"
            >
              <Home className="w-4 h-4 mr-2 inline-block" />
              Return to Home
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2 inline-block" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <AdminHeader 
        onBackToHome={onBackToHome} 
        onSignOut={handleSignOut}
        onRefresh={handleRefresh}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center">
            <div className="p-3 rounded-full bg-blue-500/20 mr-4">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Active Sessions</p>
              <p className="text-2xl font-bold text-white">{stats.activeSessions}</p>
            </div>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center">
            <div className="p-3 rounded-full bg-green-500/20 mr-4">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Players</p>
              <p className="text-2xl font-bold text-white">{stats.totalPlayers}</p>
            </div>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center">
            <div className="p-3 rounded-full bg-amber-500/20 mr-4">
              <Sword className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Characters</p>
              <p className="text-2xl font-bold text-white">{stats.totalCharacters}</p>
            </div>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center">
            <div className="p-3 rounded-full bg-purple-500/20 mr-4">
              <User className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Online Players</p>
              <p className="text-2xl font-bold text-white">{stats.onlinePlayers}</p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-6 flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-200">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-3 font-medium flex items-center ${
              activeTab === 'sessions'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Clock className="w-5 h-5 mr-2" />
            Sessions
          </button>
          
          <button
            onClick={() => setActiveTab('players')}
            className={`px-4 py-3 font-medium flex items-center ${
              activeTab === 'players'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Users className="w-5 h-5 mr-2" />
            Players
          </button>
          
          <button
            onClick={() => setActiveTab('characters')}
            className={`px-4 py-3 font-medium flex items-center ${
              activeTab === 'characters'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Sword className="w-5 h-5 mr-2" />
            Characters
          </button>
          
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-3 font-medium flex items-center ${
              activeTab === 'system'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Server className="w-5 h-5 mr-2" />
            System
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          {activeTab === 'sessions' && <SessionsPanel />}
          {activeTab === 'players' && <PlayersPanel />}
          {activeTab === 'characters' && <CharactersPanel />}
          {activeTab === 'system' && <SystemPanel />}
        </div>
      </div>
    </div>
  );
}