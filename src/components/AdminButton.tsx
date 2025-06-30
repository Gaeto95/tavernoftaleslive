import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AdminDashboard } from './AdminDashboard';

export function AdminButton() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      
      // Check if user is in admin_users table
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data); // User is admin if they exist in admin_users table
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !isAdmin) return null;

  return (
    <>
      <button
        onClick={() => setShowDashboard(true)}
        className="fixed bottom-20 right-4 z-30 p-3 bg-amber-600 hover:bg-amber-700 rounded-full text-black shadow-lg transition-colors"
        title="Admin Dashboard"
      >
        <Shield className="w-5 h-5" />
      </button>
      
      {showDashboard && (
        <AdminDashboard onClose={() => setShowDashboard(false)} />
      )}
    </>
  );
}