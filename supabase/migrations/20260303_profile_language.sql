-- Add language preference to profiles
-- Persists the user's chosen locale (ISO code) across devices
-- Default 'fr' matches the app's default locale for the Paris test group

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'fr';
