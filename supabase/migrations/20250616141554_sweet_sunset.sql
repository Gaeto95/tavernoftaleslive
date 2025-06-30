-- Drop all existing policies on admin_users table to avoid conflicts
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Service role can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Service role full access" ON admin_users;
DROP POLICY IF EXISTS "Users can check own admin status" ON admin_users;

-- Create simple, non-recursive policies
CREATE POLICY "Service role full access"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to check if they are admin (read-only)
CREATE POLICY "Users can check own admin status"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());