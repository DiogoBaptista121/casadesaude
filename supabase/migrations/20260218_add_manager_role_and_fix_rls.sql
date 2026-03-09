-- =====================================================
-- MIGRATION: Add manager role + Fix RLS + Ensure admin data
-- Date: 2026-02-18
-- =====================================================
-- 
-- This migration:
-- 1. Adds 'manager' to the app_role enum
-- 2. Fixes RLS policies (drops and recreates correctly)
-- 3. Updates helper functions to include manager
-- 4. Ensures admin user has correct profile and role
-- 5. Updates handle_new_user trigger to assign 'viewer' by default
-- =====================================================

-- =====================================================
-- STEP 1: Add 'manager' to app_role enum
-- =====================================================
-- Note: PostgreSQL requires ALTER TYPE to add enum values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

-- =====================================================
-- STEP 2: Update SECURITY DEFINER helper functions
-- These functions bypass RLS (SECURITY DEFINER), so they
-- are safe to use inside RLS policies without recursion.
-- =====================================================

-- Update is_admin_or_staff to also include manager
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('admin', 'manager', 'staff')
    )
$$;

-- Add is_admin_or_manager helper
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('admin', 'manager')
    )
$$;

-- =====================================================
-- STEP 3: Fix RLS policies for user_roles
-- Drop all existing policies and recreate correctly.
-- The SECURITY DEFINER functions prevent recursion.
-- =====================================================

-- Drop existing user_roles policies
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role full access to user_roles" ON public.user_roles;

-- Ensure RLS is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Recreate policies using SECURITY DEFINER functions (no recursion)
CREATE POLICY "Users can view own role"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- =====================================================
-- STEP 4: Fix RLS policies for profiles
-- =====================================================

-- Drop existing profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access to profiles" ON public.profiles;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert profiles"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete profiles"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- =====================================================
-- STEP 5: Update handle_new_user trigger
-- New users created by admin get 'viewer' by default
-- (admin will assign the correct role after creation)
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile (use nome from metadata if provided)
    INSERT INTO public.profiles (id, email, nome)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;

    -- Assign default role:
    -- First user ever gets admin, all others get viewer
    -- Admin can change the role after creation
    IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'viewer')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 6: Ensure admin user has correct data
-- =====================================================

-- Upsert admin profile
INSERT INTO public.profiles (id, email, nome, ativo)
VALUES (
    'de822293-cd2b-4e30-9d18-364fde74c72e',
    'wp7.baptista.ktm@gmail.com',
    'Diogo Baptista',
    true
)
ON CONFLICT (id) DO UPDATE
SET
    nome = COALESCE(NULLIF(profiles.nome, ''), 'Diogo Baptista'),
    email = 'wp7.baptista.ktm@gmail.com',
    ativo = true,
    updated_at = NOW();

-- Upsert admin role (delete old and reinsert to handle enum change)
DELETE FROM public.user_roles
WHERE user_id = 'de822293-cd2b-4e30-9d18-364fde74c72e';

INSERT INTO public.user_roles (user_id, role)
VALUES ('de822293-cd2b-4e30-9d18-364fde74c72e', 'admin');

-- =====================================================
-- STEP 7: Update existing policies that use is_admin_or_staff
-- to also include manager (via the updated function)
-- No SQL changes needed - the function update handles this.
-- =====================================================

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run these to verify everything is correct:
-- SELECT * FROM profiles WHERE id = 'de822293-cd2b-4e30-9d18-364fde74c72e';
-- SELECT * FROM user_roles WHERE user_id = 'de822293-cd2b-4e30-9d18-364fde74c72e';
-- SELECT id, nome, email, ativo FROM profiles ORDER BY nome;
-- SELECT ur.user_id, p.nome, ur.role FROM user_roles ur JOIN profiles p ON p.id = ur.user_id;
