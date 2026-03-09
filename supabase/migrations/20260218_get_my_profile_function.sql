-- =====================================================
-- FIX: Create SECURITY DEFINER function to fetch own profile + role
-- This bypasses RLS entirely, so it always works regardless of policies.
-- Run this in Supabase SQL Editor.
-- =====================================================

-- Function returns the current user's profile and role
-- SECURITY DEFINER = runs as the function owner (postgres), bypasses RLS
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (
    id UUID,
    email TEXT,
    nome TEXT,
    avatar_url TEXT,
    ativo BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.email,
        p.nome,
        p.avatar_url,
        p.ativo,
        p.created_at,
        p.updated_at,
        ur.role::TEXT
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid();
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Verify it works (run as your user via the anon key, not postgres)
-- SELECT * FROM public.get_my_profile();
