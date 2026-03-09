-- =====================================================
-- DIAGNOSTIC: Check exact state of RLS and user data
-- Run this in Supabase SQL Editor to diagnose the issue
-- =====================================================

-- 1. Check if RLS is enabled on both tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('profiles', 'user_roles');

-- 2. Check all existing RLS policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename IN ('profiles', 'user_roles')
ORDER BY tablename, policyname;

-- 3. Check admin user data
SELECT id, nome, email, ativo FROM public.profiles 
WHERE id = 'de822293-cd2b-4e30-9d18-364fde74c72e';

SELECT user_id, role FROM public.user_roles 
WHERE user_id = 'de822293-cd2b-4e30-9d18-364fde74c72e';

-- 4. Check the app_role enum values
SELECT enumlabel FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE pg_type.typname = 'app_role'
ORDER BY enumsortorder;

-- 5. Test is_admin function directly
SELECT public.is_admin('de822293-cd2b-4e30-9d18-364fde74c72e');

-- 6. List ALL users and their roles
SELECT p.id, p.nome, p.email, p.ativo, ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
ORDER BY p.nome;
