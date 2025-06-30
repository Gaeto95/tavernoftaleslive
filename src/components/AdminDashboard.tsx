import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Users, Activity, Database, Clock, Shield, UserX, RefreshCw, Search, Filter, AlertCircle } from 'lucide-react';

interface AdminDashboardProps {
  onClose: () => void;
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'sessions' | 'characters' | 'stats'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    totalSessions: 0,
    totalCharacters: 0,
    activeSessions: 0,
    newUsersToday: 0,
    sessionsToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete-user' | 'delete-session' | 'delete-character' | 'promote-admin' | 'demote-admin' | null;
    id: string | null;
    name: string | null;
  }>({ type: null, id: null, name: null });

  // Load data based on active tab
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load dashboard stats
      await loadStats();
      
      // Load tab-specific data
      switch (activeTab) {
        case 'users':
          await loadUsers();
          break;
        case 'sessions':
          await loadSessions();
          break;
        case 'characters':
          await loadCharacters();
          break;
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get total users count
      const { count: totalUsers, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      // Get total sessions count
      const { count: totalSessions, error: sessionsError } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true });
      
      // Get active sessions count
      const { count: activeSessions, error: activeSessionsError } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      // Get total characters count
      const { count: totalCharacters, error: charactersError } = await supabase
        .from('characters')
        .select('*', { count: 'exact', head: true });
      
      // Get today's new users
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: newUsersToday, error: newUsersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      
      // Get today's new sessions
      const { count: sessionsToday, error: sessionsTodayError } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      
      if (usersError || sessionsError || activeSessionsError || charactersError || newUsersError || sessionsTodayError) {
        throw new Error('Failed to load statistics');
      }
      
      setStats({
        totalUsers: totalUsers || 0,
        totalSessions: totalSessions || 0,
        totalCharacters: totalCharacters || 0,
        activeSessions: activeSessions || 0,
        newUsersToday: newUsersToday || 0,
        sessionsToday: sessionsToday || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      throw error;
    }
  };

  const loadUsers = async () => {
    try {
      // First, get all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (usersError) throw usersError;
      
      // Then, get all admin user IDs
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id');
      
      if (adminError) throw adminError;
      
      // Create a set of admin user IDs for quick lookup
      const adminUserIds = new Set(adminData?.map(admin => admin.user_id) || []);
      
      // Format users data with admin status
      const formattedUsers = usersData?.map(user => ({
        ...user,
        isAdmin: adminUserIds.has(user.id)
      })) || [];
      
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      throw error;
    }
  };

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select(`
          *,
          host:users!host_id(username, display_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      throw error;
    }
  };

  const loadCharacters = async () => {
    try {
      const { data, error } = await supabase
        .from('characters')
        .select(`
          *,
          user:users(username, display_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCharacters(data || []);
    } catch (error) {
      console.error('Error loading characters:', error);
      throw error;
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setSelectedSession(null);
    setSelectedCharacter(null);
  };

  const handleSelectSession = (session: any) => {
    setSelectedSession(session);
    setSelectedUser(null);
    setSelectedCharacter(null);
  };

  const handleSelectCharacter = (character: any) => {
    setSelectedCharacter(character);
    setSelectedUser(null);
    setSelectedSession(null);
  };

  const handleDeleteUser = async (userId: string) => {
    setIsDeleting(true);
    try {
      // Delete user from auth.users (will cascade to other tables)
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) throw error;
      
      // Refresh users list
      await loadUsers();
      setSelectedUser(null);
      setConfirmAction({ type: null, id: null, name: null });
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user. You may not have sufficient permissions.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setIsDeleting(true);
    try {
      // Delete session
      const { error } = await supabase
        .from('game_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) throw error;
      
      // Refresh sessions list
      await loadSessions();
      setSelectedSession(null);
      setConfirmAction({ type: null, id: null, name: null });
    } catch (error) {
      console.error('Error deleting session:', error);
      setError('Failed to delete session.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    setIsDeleting(true);
    try {
      // Delete character
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', characterId);
      
      if (error) throw error;
      
      // Refresh characters list
      await loadCharacters();
      setSelectedCharacter(null);
      setConfirmAction({ type: null, id: null, name: null });
    } catch (error) {
      console.error('Error deleting character:', error);
      setError('Failed to delete character.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    try {
      // Add user to admin_users table
      const { error } = await supabase
        .from('admin_users')
        .insert({ user_id: userId });
      
      if (error) throw error;
      
      // Refresh users list
      await loadUsers();
      setConfirmAction({ type: null, id: null, name: null });
    } catch (error) {
      console.error('Error promoting user to admin:', error);
      setError('Failed to promote user to admin.');
    }
  };

  const handleDemoteFromAdmin = async (userId: string) => {
    try {
      // Remove user from admin_users table
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Refresh users list
      await loadUsers();
      setConfirmAction({ type: null, id: null, name: null });
    } catch (error) {
      console.error('Error demoting admin:', error);
      setError('Failed to demote admin.');
    }
  };

  // Filter data based on search term
  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSessions = sessions.filter(session => 
    session.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.host?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.host?.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCharacters = characters.filter(character => 
    character.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    character.class_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    character.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    character.user?.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen p-4">
        <div className="max-w-7xl mx-auto bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-2 border-amber-600/50 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-900/40 to-amber-800/40 border-b border-amber-600/50 p-6">
            <div className="flex justify-between items-center">
              <h2 className="fantasy-title text-3xl font-bold text-amber-300 glow-text">
                Admin Dashboard
              </h2>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Close Dashboard
              </button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="p-6 border-b border-amber-600/30">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 text-center">
                <Users className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-300">{stats.totalUsers}</div>
                <div className="text-sm text-amber-400">Total Users</div>
              </div>
              <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 text-center">
                <Activity className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-300">{stats.activeSessions}</div>
                <div className="text-sm text-amber-400">Active Sessions</div>
              </div>
              <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 text-center">
                <Database className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-300">{stats.totalSessions}</div>
                <div className="text-sm text-amber-400">Total Sessions</div>
              </div>
              <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 text-center">
                <User className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-300">{stats.totalCharacters}</div>
                <div className="text-sm text-amber-400">Characters</div>
              </div>
              <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 text-center">
                <Clock className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-300">{stats.newUsersToday}</div>
                <div className="text-sm text-amber-400">New Users Today</div>
              </div>
              <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 text-center">
                <Activity className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-300">{stats.sessionsToday}</div>
                <div className="text-sm text-amber-400">Sessions Today</div>
              </div>
            </div>
          </div>

          {/* Tabs and Search */}
          <div className="p-6 border-b border-amber-600/30">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'users'
                      ? 'bg-amber-600 text-black'
                      : 'bg-gray-700 text-amber-300 hover:bg-gray-600'
                  }`}
                >
                  <Users className="w-5 h-5 inline mr-2" />
                  Users
                </button>
                <button
                  onClick={() => setActiveTab('sessions')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'sessions'
                      ? 'bg-amber-600 text-black'
                      : 'bg-gray-700 text-amber-300 hover:bg-gray-600'
                  }`}
                >
                  <Activity className="w-5 h-5 inline mr-2" />
                  Sessions
                </button>
                <button
                  onClick={() => setActiveTab('characters')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'characters'
                      ? 'bg-amber-600 text-black'
                      : 'bg-gray-700 text-amber-300 hover:bg-gray-600'
                  }`}
                >
                  <User className="w-5 h-5 inline mr-2" />
                  Characters
                </button>
              </div>
              
              <div className="flex items-center space-x-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearch}
                    placeholder={`Search ${activeTab}...`}
                    className="w-full p-2 pl-9 spell-input rounded-lg text-amber-50 text-sm"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-400" />
                </div>
                <button
                  onClick={handleRefresh}
                  className="p-2 bg-amber-600/20 border border-amber-600 rounded-lg text-amber-300 hover:bg-amber-600/30 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-900/30 border border-red-600 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Confirmation Dialog */}
          {confirmAction.type && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="bg-gray-900 border-2 border-amber-600 rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl text-amber-300 mb-4">Confirm Action</h3>
                
                {confirmAction.type === 'delete-user' && (
                  <p className="text-amber-100 mb-6">
                    Are you sure you want to delete the user <span className="font-bold">{confirmAction.name}</span>? This action cannot be undone and will delete all associated data.
                  </p>
                )}
                
                {confirmAction.type === 'delete-session' && (
                  <p className="text-amber-100 mb-6">
                    Are you sure you want to delete the session <span className="font-bold">{confirmAction.name}</span>? This action cannot be undone.
                  </p>
                )}
                
                {confirmAction.type === 'delete-character' && (
                  <p className="text-amber-100 mb-6">
                    Are you sure you want to delete the character <span className="font-bold">{confirmAction.name}</span>? This action cannot be undone.
                  </p>
                )}
                
                {confirmAction.type === 'promote-admin' && (
                  <p className="text-amber-100 mb-6">
                    Are you sure you want to promote <span className="font-bold">{confirmAction.name}</span> to admin? They will have full access to the admin dashboard.
                  </p>
                )}
                
                {confirmAction.type === 'demote-admin' && (
                  <p className="text-amber-100 mb-6">
                    Are you sure you want to remove admin privileges from <span className="font-bold">{confirmAction.name}</span>?
                  </p>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setConfirmAction({ type: null, id: null, name: null })}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={() => {
                      if (!confirmAction.id) return;
                      
                      switch (confirmAction.type) {
                        case 'delete-user':
                          handleDeleteUser(confirmAction.id);
                          break;
                        case 'delete-session':
                          handleDeleteSession(confirmAction.id);
                          break;
                        case 'delete-character':
                          handleDeleteCharacter(confirmAction.id);
                          break;
                        case 'promote-admin':
                          handlePromoteToAdmin(confirmAction.id);
                          break;
                        case 'demote-admin':
                          handleDemoteFromAdmin(confirmAction.id);
                          break;
                      }
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* List Panel */}
              <div className="lg:col-span-1 bg-gray-900/50 border border-amber-600/30 rounded-lg p-4 h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                  </div>
                ) : (
                  <>
                    {/* Users List */}
                    {activeTab === 'users' && (
                      <div className="space-y-2">
                        <h3 className="text-lg text-amber-300 mb-3">Users ({filteredUsers.length})</h3>
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map(user => (
                            <div
                              key={user.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedUser?.id === user.id
                                  ? 'bg-amber-900/30 border-amber-500'
                                  : 'border-gray-700 hover:border-amber-600/50 hover:bg-gray-800/50'
                              }`}
                              onClick={() => handleSelectUser(user)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-amber-200">{user.display_name || user.username}</div>
                                  <div className="text-xs text-amber-400">{user.username}</div>
                                </div>
                                {user.isAdmin && (
                                  <div className="px-2 py-1 bg-amber-600/30 border border-amber-500 rounded-full text-amber-300 text-xs">
                                    Admin
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-amber-400">
                            No users found matching your search.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sessions List */}
                    {activeTab === 'sessions' && (
                      <div className="space-y-2">
                        <h3 className="text-lg text-amber-300 mb-3">Sessions ({filteredSessions.length})</h3>
                        {filteredSessions.length > 0 ? (
                          filteredSessions.map(session => (
                            <div
                              key={session.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedSession?.id === session.id
                                  ? 'bg-amber-900/30 border-amber-500'
                                  : 'border-gray-700 hover:border-amber-600/50 hover:bg-gray-800/50'
                              }`}
                              onClick={() => handleSelectSession(session)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-amber-200">{session.name}</div>
                                  <div className="text-xs text-amber-400">
                                    Host: {session.host?.display_name || session.host?.username || 'Unknown'}
                                  </div>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs ${
                                  session.is_active
                                    ? 'bg-green-600/30 border border-green-500 text-green-300'
                                    : 'bg-gray-600/30 border border-gray-500 text-gray-300'
                                }`}>
                                  {session.is_active ? 'Active' : 'Inactive'}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-amber-400">
                            No sessions found matching your search.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Characters List */}
                    {activeTab === 'characters' && (
                      <div className="space-y-2">
                        <h3 className="text-lg text-amber-300 mb-3">Characters ({filteredCharacters.length})</h3>
                        {filteredCharacters.length > 0 ? (
                          filteredCharacters.map(character => (
                            <div
                              key={character.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedCharacter?.id === character.id
                                  ? 'bg-amber-900/30 border-amber-500'
                                  : 'border-gray-700 hover:border-amber-600/50 hover:bg-gray-800/50'
                              }`}
                              onClick={() => handleSelectCharacter(character)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-amber-200">{character.name}</div>
                                  <div className="text-xs text-amber-400">
                                    Level {character.level} {character.class_id}
                                  </div>
                                </div>
                                <div className="text-xs text-amber-400">
                                  {character.user?.display_name || character.user?.username || 'Unknown'}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-amber-400">
                            No characters found matching your search.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Detail Panel */}
              <div className="lg:col-span-2 bg-gray-900/50 border border-amber-600/30 rounded-lg p-4 h-[600px] overflow-y-auto">
                {/* User Details */}
                {selectedUser && activeTab === 'users' && (
                  <div>
                    <h3 className="text-xl text-amber-300 mb-4 flex items-center">
                      <User className="w-6 h-6 mr-2" />
                      User Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm text-amber-400">Username</div>
                          <div className="text-lg text-amber-200">{selectedUser.username}</div>
                        </div>
                        <div>
                          <div className="text-sm text-amber-400">Display Name</div>
                          <div className="text-lg text-amber-200">{selectedUser.display_name || 'Not set'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-amber-400">User ID</div>
                          <div className="text-sm text-amber-200 break-all">{selectedUser.id}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm text-amber-400">Created At</div>
                          <div className="text-amber-200">{formatDate(selectedUser.created_at)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-amber-400">Last Seen</div>
                          <div className="text-amber-200">{selectedUser.last_seen ? formatDate(selectedUser.last_seen) : 'Never'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-amber-400">Role</div>
                          <div className="text-amber-200">{selectedUser.isAdmin ? 'Admin' : 'User'}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-amber-600/30 pt-4 mt-4">
                      <h4 className="text-lg text-amber-300 mb-3">Actions</h4>
                      <div className="flex flex-wrap gap-3">
                        {selectedUser.isAdmin ? (
                          <button
                            onClick={() => setConfirmAction({
                              type: 'demote-admin',
                              id: selectedUser.id,
                              name: selectedUser.display_name || selectedUser.username
                            })}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-black transition-colors"
                          >
                            <Shield className="w-4 h-4 inline mr-2" />
                            Remove Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmAction({
                              type: 'promote-admin',
                              id: selectedUser.id,
                              name: selectedUser.display_name || selectedUser.username
                            })}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-black transition-colors"
                          >
                            <Shield className="w-4 h-4 inline mr-2" />
                            Make Admin
                          </button>
                        )}
                        
                        <button
                          onClick={() => setConfirmAction({
                            type: 'delete-user',
                            id: selectedUser.id,
                            name: selectedUser.display_name || selectedUser.username
                          })}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
                        >
                          <UserX className="w-4 h-4 inline mr-2" />
                          Delete User
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Session Details */}
                {selectedSession && activeTab === 'sessions' && (
                  <div>
                    <h3 className="text-xl text-amber-300 mb-4 flex items-center">
                      <Activity className="w-6 h-6 mr-2" />
                      Session Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm text-amber-400">Session Name</div>
                          <div className="text-lg text-amber-200">{selectedSession.name}</div>
                        </div>
                        <div>
                          <div className="text-sm text-amber-400">Description</div>
                          <div className="text-amber-200">{selectedSession.description || 'No description'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-amber-400">Host</div>
                          <div className="text-amber-200">
                            {selectedSession.host?.display_name || selectedSession.host?.username || 'Unknown'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm text-amber-400">Created At</div>
                          <div className="text-amber-200">{formatDate(selectedSession.created_at)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-amber-400">Status</div>
                          <div className="text-amber-200">
                            {selectedSession.is_active ? 'Active' : 'Inactive'} • 
                            {selectedSession.is_public ? ' Public' : ' Private'} •
                            Players: {selectedSession.current_players}/{selectedSession.max_players}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-amber-400">Current Turn</div>
                          <div className="text-amber-200">
                            Turn {selectedSession.current_turn} • 
                            Phase: {selectedSession.turn_phase}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-amber-600/30 pt-4 mt-4">
                      <h4 className="text-lg text-amber-300 mb-3">Actions</h4>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setConfirmAction({
                            type: 'delete-session',
                            id: selectedSession.id,
                            name: selectedSession.name
                          })}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
                        >
                          Delete Session
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Character Details */}
                {selectedCharacter && activeTab === 'characters' && (
                  <div>
                    <h3 className="text-xl text-amber-300 mb-4 flex items-center">
                      <User className="w-6 h-6 mr-2" />
                      Character Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm text-amber-400">Character Name</div>
                          <div className="text-lg text-amber-200">{selectedCharacter.name}</div>
                        </div>
                        <div>
                          <div className="text-sm text-amber-400">Class</div>
                          <div className="text-amber-200">{selectedCharacter.class_id}</div>
                        </div>
                        <div>
                          <div className="text-sm text-amber-400">Level</div>
                          <div className="text-amber-200">{selectedCharacter.level}</div>
                        </div>
                        <div>
                          <div className="text-sm text-amber-400">Owner</div>
                          <div className="text-amber-200">
                            {selectedCharacter.user?.display_name || selectedCharacter.user?.username || 'Unknown'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm text-amber-400">Created At</div>
                          <div className="text-amber-200">{formatDate(selectedCharacter.created_at)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-amber-400">Last Updated</div>
                          <div className="text-amber-200">{formatDate(selectedCharacter.updated_at)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-amber-400">Stats</div>
                          <div className="text-amber-200">
                            HP: {selectedCharacter.hit_points}/{selectedCharacter.max_hit_points} • 
                            AC: {selectedCharacter.armor_class} •
                            XP: {selectedCharacter.experience}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-amber-600/30 pt-4 mt-4">
                      <h4 className="text-lg text-amber-300 mb-3">Actions</h4>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setConfirmAction({
                            type: 'delete-character',
                            id: selectedCharacter.id,
                            name: selectedCharacter.name
                          })}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
                        >
                          Delete Character
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* No Selection State */}
                {!selectedUser && !selectedSession && !selectedCharacter && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="text-6xl mb-4">👈</div>
                    <h3 className="text-xl text-amber-300 mb-2">Select an item from the list</h3>
                    <p className="text-amber-400 text-center max-w-md">
                      Choose a {activeTab === 'users' ? 'user' : activeTab === 'sessions' ? 'session' : 'character'} from the list to view details and perform actions.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}