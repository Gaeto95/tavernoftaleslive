/*
  # Fix admin_users table RLS policy recursion

  1. Security Changes
    - Drop existing recursive RLS policies on admin_users table
    - Create simple, non-recursive policies for admin_users table
    - Ensure policies don't reference admin_users table within their conditions

  This migration fixes the infinite recursion error in the admin_users table policies.
*/

-- Drop all existing policies on admin_users table
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Service role can manage admin users" ON admin_users;

-- Create simple, non-recursive policies
CREATE POLICY "Service role full access"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to check if they are admin (read-only)
-- This policy is simple and doesn't reference admin_users table recursively
CREATE POLICY "Users can check own admin status"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());