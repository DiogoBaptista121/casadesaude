import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, AppRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  canEdit: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Uses a SECURITY DEFINER function to fetch profile + role in one call.
   * This bypasses RLS entirely, so it always works regardless of policy state.
   */
  const fetchUserData = async (userId: string) => {
    console.log('[Auth] fetchUserData for:', userId);
    try {
      // Try the SECURITY DEFINER function first (bypasses RLS)
      // @ts-ignore — get_my_profile exists in the DB but is not in the stale generated types
      const { data, error } = await (supabase.rpc as any)('get_my_profile');

      if (error) {
        console.warn('[Auth] get_my_profile RPC failed, falling back to direct queries:', error.message);
        // Fallback: direct table queries
        await fetchUserDataFallback(userId);
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        const row = data[0];
        console.log('[Auth] Profile via RPC:', row.nome, '| Role:', row.role);
        setProfile({
          id: row.id,
          email: row.email,
          nome: row.nome,
          avatar_url: row.avatar_url,
          ativo: row.ativo,
          created_at: row.created_at,
          updated_at: row.updated_at,
        } as Profile);
        setRole((row.role as AppRole) ?? null);
      } else {
        console.warn('[Auth] get_my_profile returned no rows — falling back');
        await fetchUserDataFallback(userId);
      }
    } catch (err) {
      console.error('[Auth] Unexpected error:', err);
      await fetchUserDataFallback(userId);
    } finally {
      setLoading(false);
    }
  };

  /** Direct table queries fallback — does NOT touch user_roles to avoid RLS recursion */
  const fetchUserDataFallback = async (userId: string) => {
    console.log('[Auth] Using fallback direct queries for:', userId);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('[Auth] Profile fetch error:', profileError.code, profileError.message);
    } else {
      console.log('[Auth] Profile (fallback):', profileData?.nome);
      setProfile(profileData as Profile);
    }

    // ⚠️  Do NOT query user_roles directly — it triggers infinite RLS recursion.
    // Instead, read the role from the JWT session claims (app_metadata.role),
    // which Supabase populates via the custom claims hook without any table read.
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const jwtRole = (currentSession?.user?.app_metadata?.role as AppRole) ?? null;
    if (jwtRole) {
      console.log('[Auth] Role from JWT claim (fallback):', jwtRole);
      setRole(jwtRole);
    } else {
      // Last resort: the user is authenticated but role couldn't be determined.
      // Default to null (lowest privilege) — the UI will show read-only access.
      console.warn('[Auth] No role found in JWT claims — defaulting to null (viewer)');
      setRole(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let hasFetched = false;

    const doFetch = (userId: string) => {
      if (!isMounted) return;
      hasFetched = true;
      fetchUserData(userId);
    };

    // 1. Check for existing session immediately
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!isMounted) return;
      console.log('[Auth] getSession — user:', existingSession?.user?.id ?? 'none');
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        doFetch(existingSession.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth state changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!isMounted) return;
        console.log('[Auth] onAuthStateChange:', event);

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_IN' && currentSession?.user && !hasFetched) {
          // Only fetch if getSession didn't already trigger it
          setLoading(true);
          setTimeout(() => doFetch(currentSession.user.id), 100);
        } else if (event === 'SIGNED_IN' && currentSession?.user && hasFetched) {
          // Re-fetch on explicit sign in (e.g. after login page)
          setLoading(true);
          setTimeout(() => {
            hasFetched = false;
            doFetch(currentSession.user.id);
          }, 100);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRole(null);
          setLoading(false);
          hasFetched = false;
        } else if (event === 'TOKEN_REFRESHED' && currentSession?.user) {
          // Token refreshed — re-fetch to ensure data is current
          setTimeout(() => doFetch(currentSession.user.id), 100);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { nome } }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isStaff = role === 'staff';
  const canEdit = isAdmin || isManager || isStaff;

  return (
    <AuthContext.Provider value={{
      user, session, profile, role, loading,
      signIn, signUp, signOut,
      isAdmin, isManager, isStaff, canEdit,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
