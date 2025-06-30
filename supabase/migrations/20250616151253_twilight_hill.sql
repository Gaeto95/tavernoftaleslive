/*
  # Fix Characters-Users Foreign Key Relationship

  1. Changes
    - Drop the existing foreign key constraint that references auth.users
    - Add a new foreign key constraint that references the public.users table
    - This will allow proper joins between characters and users tables

  2. Security
    - Maintains existing RLS policies
    - No changes to data access patterns
*/

-- Drop the existing foreign key constraint that references auth.users
ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_user_id_fkey;

-- Add the correct foreign key constraint that references public.users
ALTER TABLE characters 
ADD CONSTRAINT characters_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;