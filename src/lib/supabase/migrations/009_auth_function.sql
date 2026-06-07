-- Migration 009: Authentication helper using pgcrypto
-- Creates pgcrypto extension (if not exists) and an RPC function to verify password using crypt()

-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function: auth_user(email, password)
-- Returns user row only when password matches stored crypt() hash
CREATE OR REPLACE FUNCTION public.auth_user(p_email text, p_password text)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text,
  status text,
  password_hash text,
  photo_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT id, email, name, role, status, password_hash, photo_url
  FROM public.users
  WHERE email = p_email
    AND password_hash IS NOT NULL
    AND password_hash = crypt(p_password, password_hash)
  LIMIT 1;
END
$$ LANGUAGE plpgsql SECURITY DEFINER;
