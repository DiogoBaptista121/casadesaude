-- =====================================================
-- ADMIN FUNCTIONS: Secure server-side operations
-- All functions use SECURITY DEFINER to bypass RLS
-- and verify the caller is admin before acting.
-- Run this in Supabase SQL Editor.
-- =====================================================

-- =====================================================
-- 1. get_all_users() — List all users with their roles
--    Only callable by authenticated users (admin check inside)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    nome TEXT,
    avatar_url TEXT,
    ativo BOOLEAN,
    created_at TIMESTAMPTZ,
    role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller is admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: admin role required';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.email,
        p.nome,
        p.avatar_url,
        p.ativo,
        p.created_at,
        ur.role::TEXT
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    ORDER BY p.nome;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;

-- =====================================================
-- 2. update_user_role(target_user_id, new_role)
--    Admin-only: update another user's role
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_user_role(
    _target_user_id UUID,
    _new_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _role app_role;
    _admin_count INTEGER;
BEGIN
    -- Verify caller is admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: admin role required';
    END IF;

    -- Validate role value
    BEGIN
        _role := _new_role::app_role;
    EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Invalid role: %', _new_role;
    END;

    -- Prevent removing the last admin
    IF _role != 'admin' THEN
        SELECT COUNT(*) INTO _admin_count
        FROM public.user_roles
        WHERE role = 'admin' AND user_id != _target_user_id;

        IF _admin_count = 0 AND public.is_admin(_target_user_id) THEN
            RAISE EXCEPTION 'Cannot remove the last admin';
        END IF;
    END IF;

    -- Upsert the role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user_id, _role)
    ON CONFLICT (user_id, role) DO UPDATE SET role = _role;

    -- Delete any other roles for this user (ensure single role)
    DELETE FROM public.user_roles
    WHERE user_id = _target_user_id AND role != _role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, TEXT) TO authenticated;

-- =====================================================
-- 3. update_user_profile(target_user_id, new_nome)
--    Admin-only: update another user's profile name
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_user_profile(
    _target_user_id UUID,
    _new_nome TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller is admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: admin role required';
    END IF;

    UPDATE public.profiles
    SET nome = _new_nome, updated_at = NOW()
    WHERE id = _target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, TEXT) TO authenticated;

-- =====================================================
-- 4. toggle_user_active(target_user_id, is_active)
--    Admin-only: activate or suspend a user
-- =====================================================
CREATE OR REPLACE FUNCTION public.toggle_user_active(
    _target_user_id UUID,
    _ativo BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller is admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: admin role required';
    END IF;

    -- Prevent deactivating self
    IF _target_user_id = auth.uid() AND NOT _ativo THEN
        RAISE EXCEPTION 'Cannot deactivate your own account';
    END IF;

    UPDATE public.profiles
    SET ativo = _ativo, updated_at = NOW()
    WHERE id = _target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_user_active(UUID, BOOLEAN) TO authenticated;

-- =====================================================
-- 5. delete_user_profile(target_user_id)
--    Admin-only: delete a user's profile and role
--    Note: does NOT delete from auth.users (requires service role)
--    The profile will be orphaned but auth user remains.
--    For full deletion, use Supabase Dashboard or Edge Function.
-- =====================================================
CREATE OR REPLACE FUNCTION public.delete_user_profile(
    _target_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _admin_count INTEGER;
BEGIN
    -- Verify caller is admin
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: admin role required';
    END IF;

    -- Prevent deleting self
    IF _target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete your own account';
    END IF;

    -- Prevent deleting the last admin
    IF public.is_admin(_target_user_id) THEN
        SELECT COUNT(*) INTO _admin_count
        FROM public.user_roles
        WHERE role = 'admin';

        IF _admin_count <= 1 THEN
            RAISE EXCEPTION 'Cannot delete the last admin';
        END IF;
    END IF;

    -- Delete role first (FK)
    DELETE FROM public.user_roles WHERE user_id = _target_user_id;

    -- Delete profile
    DELETE FROM public.profiles WHERE id = _target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_profile(UUID) TO authenticated;

-- =====================================================
-- VERIFY: Test the functions work
-- =====================================================
-- SELECT * FROM public.get_all_users();
-- SELECT public.update_user_role('some-uuid', 'staff');
