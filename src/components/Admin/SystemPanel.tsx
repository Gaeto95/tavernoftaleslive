import React, { useState, useEffect } from 'react';
import { 
  Server, Database, RefreshCw, AlertTriangle, 
  CheckCircle, Clock, Trash2, Play, Settings
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ConfirmationModal } from './ConfirmationModal';

export function SystemPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    databaseSize: string;
    tableRowCounts: {[key: string]: number};
    cleanupQueue: number;
    lastCleanup: string;
    systemVersion: string;
  }>({
    databaseSize: '0 MB',
    tableRowCounts: {},
    cleanupQueue: 0,
    lastCleanup: 'Never',
    systemVersion: '1.0.0'
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);
  const [cleanupResult, setCleanupResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  // Load system stats
  const loadSystemStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get table row counts
      const tables = [
        'users', 'characters', 'game_sessions', 'session_players', 
        'turn_actions', 'story_entries', 'chat_messages', 'session_cleanup_queue'
      ];
      
      const tableCounts: {[key: string]: number} = {};
      
      for (const table of tables) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
          
        if (error) throw error;
        
        tableCounts[table] = count || 0;
      }
      
      // Get cleanup queue count
      const { count: queueCount, error: queueError } = await supabase
        .from('session_cleanup_queue')
        .select('*', { count: 'exact', head: true });
        
      if (queueError) throw queueError;
      
      // Get last cleanup time from settings (would need to be implemented)
      // For now, use a placeholder
      const lastCleanup = 'Not recorded';
      
      setStats({
        databaseSize: 'Unknown', // Would need a special endpoint to get this
        tableRowCounts: tableCounts,
        cleanupQueue: queueCount || 0,
        lastCleanup,
        systemVersion: '1.0.0' // Placeholder
      });
    } catch (err) {
      console.error('Error loading system stats:', err);
      setError('Failed to load system statistics');
    } finally {
      setLoading(false);
    }
  };

  // Load stats on mount
  useEffect(() => {
    loadSystemStats();
  }, []);

  // Run cleanup
  const confirmRunCleanup = () => {
    setConfirmationAction({
      title: 'Run System Cleanup',
      message: 'Are you sure you want to run the system cleanup? This will process the cleanup queue, remove orphaned sessions, and clean up old data.',
      action: async () => {
        try {
          setLoading(true);
          
          // Call RPC function to run all cleanup operations
          const { data, error } = await supabase.rpc('run_session_cleanup');
          
          if (error) throw error;
          
          setCleanupResult({
            success: true,
            message: 'Cleanup completed successfully',
            details: data
          });
          
          // Reload stats
          await loadSystemStats();
        } catch (err) {
          console.error('Error running cleanup:', err);
          setCleanupResult({
            success: false,
            message: 'Failed to run cleanup',
            details: err
          });
        } finally {
          setLoading(false);
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  // Process cleanup queue
  const confirmProcessQueue = () => {
    setConfirmationAction({
      title: 'Process Cleanup Queue',
      message: 'Are you sure you want to process the session cleanup queue? This will clean up sessions that have been queued for deletion.',
      action: async () => {
        try {
          setLoading(true);
          
          // Call RPC function to process the cleanup queue
          const { data, error } = await supabase.rpc('process_session_cleanup_queue');
          
          if (error) throw error;
          
          setCleanupResult({
            success: true,
            message: `Processed ${data} sessions from the cleanup queue`,
            details: { processed: data }
          });
          
          // Reload stats
          await loadSystemStats();
        } catch (err) {
          console.error('Error processing cleanup queue:', err);
          setCleanupResult({
            success: false,
            message: 'Failed to process cleanup queue',
            details: err
          });
        } finally {
          setLoading(false);
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  // Clean up orphaned sessions
  const confirmCleanupOrphaned = () => {
    setConfirmationAction({
      title: 'Clean Up Orphaned Sessions',
      message: 'Are you sure you want to clean up orphaned sessions? This will mark sessions with no players as inactive.',
      action: async () => {
        try {
          setLoading(true);
          
          // Call RPC function to clean up orphaned sessions
          const { data, error } = await supabase.rpc('cleanup_orphaned_sessions');
          
          if (error) throw error;
          
          setCleanupResult({
            success: true,
            message: `Cleaned up ${data} orphaned sessions`,
            details: { cleaned: data }
          });
          
          // Reload stats
          await loadSystemStats();
        } catch (err) {
          console.error('Error cleaning up orphaned sessions:', err);
          setCleanupResult({
            success: false,
            message: 'Failed to clean up orphaned sessions',
            details: err
          });
        } finally {
          setLoading(false);
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  // Clean up old chat messages
  const confirmCleanupChat = () => {
    setConfirmationAction({
      title: 'Clean Up Old Chat Messages',
      message: 'Are you sure you want to clean up old chat messages? This will delete messages older than 7 days.',
      action: async () => {
        try {
          setLoading(true);
          
          // Call RPC function to clean up old chat messages
          const { data, error } = await supabase.rpc('cleanup_old_chat_messages', {
            days_to_keep: 7
          });
          
          if (error) throw error;
          
          setCleanupResult({
            success: true,
            message: `Deleted ${data} old chat messages`,
            details: { deleted: data }
          });
          
          // Reload stats
          await loadSystemStats();
        } catch (err) {
          console.error('Error cleaning up old chat messages:', err);
          setCleanupResult({
            success: false,
            message: 'Failed to clean up old chat messages',
            details: err
          });
        } finally {
          setLoading(false);
          setShowConfirmation(false);
        }
      }
    });
    setShowConfirmation(true);
  };

  return (
    <div>
      {/* Confirmation Modal */}
      {showConfirmation && confirmationAction && (
        <ConfirmationModal
          title={confirmationAction.title}
          message={confirmationAction.message}
          onConfirm={confirmationAction.action}
          onCancel={() => setShowConfirmation(false)}
        />
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center">
          <Server className="w-5 h-5 mr-2 text-purple-400" />
          System Management
        </h2>
        
        <button
          onClick={loadSystemStats}
          className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white"
          disabled={loading}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-6">
          <p className="text-red-200 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
            {error}
          </p>
        </div>
      )}
      
      {/* Cleanup Result */}
      {cleanupResult && (
        <div className={`${
          cleanupResult.success 
            ? 'bg-green-900/30 border border-green-600' 
            : 'bg-red-900/30 border border-red-600'
        } rounded-lg p-4 mb-6`}>
          <p className={`flex items-center ${
            cleanupResult.success ? 'text-green-200' : 'text-red-200'
          }`}>
            {cleanupResult.success ? (
              <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
            )}
            {cleanupResult.message}
          </p>
          {cleanupResult.details && (
            <pre className="mt-2 p-2 bg-gray-800 rounded text-xs overflow-x-auto">
              {JSON.stringify(cleanupResult.details, null, 2)}
            </pre>
          )}
        </div>
      )}
      
      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Database Stats */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2 text-blue-400" />
            Database Statistics
          </h3>
          
          {loading ? (
            <div className="flex justify-center py-4">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(stats.tableRowCounts).map(([table, count]) => (
                  <div key={table} className="bg-gray-700 rounded-lg p-3">
                    <div className="text-gray-400 text-sm">{table}</div>
                    <div className="text-xl font-bold text-white">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Cleanup Stats */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-green-400" />
            Cleanup Status
          </h3>
          
          {loading ? (
            <div className="flex justify-center py-4">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <div className="text-gray-400 text-sm">Cleanup Queue</div>
                  <div className="text-xl font-bold text-white">{stats.cleanupQueue}</div>
                </div>
                <button
                  onClick={confirmProcessQueue}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
                  disabled={stats.cleanupQueue === 0}
                >
                  Process Queue
                </button>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Last Cleanup Run</div>
                <div className="text-xl font-bold text-white">{stats.lastCleanup}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Maintenance Actions */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2 text-amber-400" />
          Maintenance Actions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={confirmRunCleanup}
            className="p-4 bg-purple-600/20 border border-purple-600 rounded-lg hover:bg-purple-600/30 transition-colors text-center"
            disabled={loading}
          >
            <Play className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <div className="text-purple-300 font-medium">Run Full Cleanup</div>
            <div className="text-purple-400 text-xs mt-1">Process all cleanup tasks</div>
          </button>
          
          <button
            onClick={confirmCleanupOrphaned}
            className="p-4 bg-blue-600/20 border border-blue-600 rounded-lg hover:bg-blue-600/30 transition-colors text-center"
            disabled={loading}
          >
            <Trash2 className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-blue-300 font-medium">Clean Orphaned Sessions</div>
            <div className="text-blue-400 text-xs mt-1">Mark empty sessions as inactive</div>
          </button>
          
          <button
            onClick={confirmCleanupChat}
            className="p-4 bg-green-600/20 border border-green-600 rounded-lg hover:bg-green-600/30 transition-colors text-center"
            disabled={loading}
          >
            <Trash2 className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-green-300 font-medium">Clean Old Chat Messages</div>
            <div className="text-green-400 text-xs mt-1">Delete messages older than 7 days</div>
          </button>
          
          <button
            onClick={loadSystemStats}
            className="p-4 bg-amber-600/20 border border-amber-600 rounded-lg hover:bg-amber-600/30 transition-colors text-center"
            disabled={loading}
          >
            <RefreshCw className={`w-6 h-6 text-amber-400 mx-auto mb-2 ${loading ? 'animate-spin' : ''}`} />
            <div className="text-amber-300 font-medium">Refresh Statistics</div>
            <div className="text-amber-400 text-xs mt-1">Update all system stats</div>
          </button>
        </div>
      </div>
      
      {/* System Information */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <Server className="w-5 h-5 mr-2 text-blue-400" />
          System Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-gray-400 text-sm">System Version</div>
            <div className="text-xl font-bold text-white">{stats.systemVersion}</div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Database Size</div>
            <div className="text-xl font-bold text-white">{stats.databaseSize}</div>
          </div>
        </div>
      </div>
    </div>
  );
}