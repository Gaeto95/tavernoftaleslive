/*
  # Fix User Profile Creation System

  1. Issues Fixed
    - Remove syntax error with RAISE NOTICE outside of DO block
    - Ensure proper user profile creation for auth users
    - Add automatic profile creation trigger
    - Handle existing users without profiles

  2. Changes
    - Add unique constraint on username if missing
    - Create auto-profile creation function and trigger
    - Add manual profile creation function
    - Update RLS policies for profile creation
    - Create profiles for existing auth users
*/

-- Ensure users table has proper structure
DO $$
BEGIN
  -- Add username unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_username_key'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
  END IF;
END $$;

-- Update users table to ensure proper defaults
ALTER TABLE users ALTER COLUMN id SET DEFAULT auth.uid();
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE users ALTER COLUMN last_seen SET DEFAULT now();

-- Function to auto-create user profile when auth user is created
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  username_value text;
BEGIN
  -- Generate username from email or use a default
  username_value := COALESCE(
    split_part(NEW.email, '@', 1),
    'user_' || substr(NEW.id::text, 1, 8)
  );
  
  -- Ensure username is unique by appending numbers if needed
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = username_value) LOOP
    username_value := username_value || '_' || floor(random() * 1000)::text;
  END LOOP;
  
  -- Insert user profile
  INSERT INTO public.users (
    id,
    username,
    display_name,
    created_at,
    updated_at,
    last_seen
  ) VALUES (
    NEW.id,
    username_value,
    COALESCE(NEW.raw_user_meta_data->>'display_name', username_value),
    now(),
    now(),
    now()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user creation
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger to auto-create profiles (only if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Function to handle user profile creation manually (for existing users)
CREATE OR REPLACE FUNCTION ensure_user_profile(user_id uuid, user_email text DEFAULT NULL)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record public.users;
  username_value text;
BEGIN
  -- Check if profile already exists
  SELECT * INTO user_record FROM public.users WHERE id = user_id;
  
  IF FOUND THEN
    RETURN user_record;
  END IF;
  
  -- Generate username from email or use a default
  username_value := COALESCE(
    split_part(user_email, '@', 1),
    'user_' || substr(user_id::text, 1, 8)
  );
  
  -- Ensure username is unique
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = username_value) LOOP
    username_value := username_value || '_' || floor(random() * 1000)::text;
  END LOOP;
  
  -- Create user profile
  INSERT INTO public.users (
    id,
    username,
    display_name,
    created_at,
    updated_at,
    last_seen
  ) VALUES (
    user_id,
    username_value,
    username_value,
    now(),
    now(),
    now()
  ) RETURNING * INTO user_record;
  
  RETURN user_record;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION ensure_user_profile(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile() TO service_role;

-- Update RLS policies to be more permissive for profile creation
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow service role to insert profiles (for the trigger)
DROP POLICY IF EXISTS "Service role can insert profiles" ON users;
CREATE POLICY "Service role can insert profiles"
  ON users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Ensure existing auth users have profiles
DO $$
DECLARE
  auth_user_record RECORD;
  profile_count integer := 0;
BEGIN
  FOR auth_user_record IN 
    SELECT au.id, au.email 
    FROM auth.users au 
    LEFT JOIN public.users pu ON au.id = pu.id 
    WHERE pu.id IS NULL
  LOOP
    BEGIN
      PERFORM ensure_user_profile(auth_user_record.id, auth_user_record.email);
      profile_count := profile_count + 1;
      RAISE NOTICE 'Created profile for existing user: %', auth_user_record.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for user %: %', auth_user_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'User profile creation system setup complete. Created % profiles.', profile_count;
END $$;

-- Force PostgREST to reload schema
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  RAISE NOTICE 'Schema reload notification sent to PostgREST';
END $$;