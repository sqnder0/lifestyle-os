import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

async function ensureProfile(user) {
  if (!user?.id) return null;

  const { data: existing, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;

  if (existing) return existing;

  const fallbackName =
    user.user_metadata?.first_name
    || user.user_metadata?.name
    || user.email?.split('@')?.[0]
    || '';

  const insertPayload = {
    id: user.id,
    first_name: fallbackName,
    onboarded: false,
    settings: {},
  };

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .upsert(insertPayload, { onConflict: 'id' })
    .select('*')
    .single();

  if (createError) throw createError;
  return created;
}

export function useSupabaseAuth() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshProfile = useCallback(async (nextUser) => {
    const targetUser = nextUser ?? userRef.current;

    if (!targetUser?.id) {
      setProfile(null);
      return null;
    }

    setProfileLoading(true);
    try {
      const row = await ensureProfile(targetUser);
      setProfile(row);
      setAuthError(null);
      return row;
    } catch (error) {
      const message = error?.message || 'Failed to load profile.';
      setAuthError(message);
      throw error;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          setAuthError(error.message || 'Failed to restore session.');
          return;
        }

        const nextSession = data?.session ?? null;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (nextSession?.user) {
          try {
            await refreshProfile(nextSession.user);
          } catch (profileError) {
            console.error('Profile bootstrap failed', profileError);
            if (mounted) setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        if (mounted) {
          setAuthError(error?.message || 'Authentication bootstrap failed.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        refreshProfile(nextSession.user).catch((error) => {
          console.error('Profile refresh failed after auth state change', error);
          setProfile(null);
        });
      } else {
        setProfile(null);
        setAuthError(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signIn = useCallback(async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async ({ email, password }) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'https://www.googleapis.com/auth/calendar.readonly',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
  }, []);

  const linkGoogleIdentity = useCallback(async () => {
    const redirectTo = `${window.location.origin}/`;

    if (typeof supabase.auth.linkIdentity === 'function') {
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo,
          scopes: 'https://www.googleapis.com/auth/calendar.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.assign(data.url);
      }
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'https://www.googleapis.com/auth/calendar.readonly',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
  }, []);

  const linkedProviders = useMemo(() => {
    const identityProviders = Array.isArray(user?.identities)
      ? user.identities.map((identity) => identity.provider).filter(Boolean)
      : [];

    const appProviders = Array.isArray(user?.app_metadata?.providers)
      ? user.app_metadata.providers
      : [];

    return [...new Set([...identityProviders, ...appProviders])];
  }, [user]);

  const googleIdentityTokens = useMemo(() => {
    const provider = session?.user?.app_metadata?.provider || null;
    if (provider !== 'google' && !linkedProviders.includes('google')) {
      return null;
    }

    if (!session?.provider_token) return null;

    return {
      accessToken: session.provider_token,
      refreshToken: session.provider_refresh_token ?? null,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      email: session.user?.email ?? null,
    };
  }, [session, linkedProviders]);

  const completeOnboarding = useCallback(async ({ firstName, sleepTarget }) => {
    if (!user?.id) throw new Error('No authenticated user.');

    const cleanName = (firstName || '').trim();
    const nextSettings = {
      ...(profile?.settings ?? {}),
      name: cleanName,
      sleepTarget: typeof sleepTarget === 'number' ? sleepTarget : (profile?.settings?.sleepTarget ?? 8),
      metricTargets: {
        ...(profile?.settings?.metricTargets ?? {}),
        sleepHours: typeof sleepTarget === 'number' ? sleepTarget : (profile?.settings?.metricTargets?.sleepHours ?? 8),
      },
      onboarded: true,
    };

    const { data, error } = await supabase
      .from('profiles')
      .update({
        first_name: cleanName,
        username: cleanName,
        onboarded: true,
        settings: nextSettings,
      })
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  }, [user, profile]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return useMemo(() => ({
    session,
    token: session?.access_token ?? null,
    user,
    profile,
    loading,
    profileLoading,
    authError,
    linkedProviders,
    googleIdentityTokens,
    signIn,
    signUp,
    signInWithGoogle,
    linkGoogleIdentity,
    signOut,
    refreshProfile,
    completeOnboarding,
  }), [
    session,
    user,
    profile,
    loading,
    profileLoading,
    authError,
    linkedProviders,
    googleIdentityTokens,
    signIn,
    signUp,
    signInWithGoogle,
    linkGoogleIdentity,
    signOut,
    refreshProfile,
    completeOnboarding,
  ]);
}
