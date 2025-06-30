-- Create storage bucket for avatars if it doesn't exist
DO $$
BEGIN
  -- This would normally be done through the Supabase dashboard or CLI
  -- For this migration, we'll just ensure the avatar_url column exists
  
  -- Make sure avatar_url column exists in users table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Create policy to allow users to upload their own avatars
-- Note: This would normally be done through the Supabase dashboard for storage
-- but we're including it here for completeness

-- Add RLS policy for users to update their avatar_url
CREATE POLICY "Users can update their avatar_url"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());