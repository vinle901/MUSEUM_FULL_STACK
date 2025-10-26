-- Add password_must_change column to users table
-- This is used to force employees to change their password on first login

ALTER TABLE users
ADD COLUMN password_must_change BOOLEAN DEFAULT FALSE;

-- Set existing users to not require password change
UPDATE users SET password_must_change = FALSE WHERE password_must_change IS NULL;
