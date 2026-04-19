import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';

const TOKEN_KEY = 'lifestyle-os-token';

function readAuthParams() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = searchParams.get('auth_token') || hashParams.get('auth_token');
  const error = searchParams.get('auth_error') || hashParams.get('auth_error');

  if (token || error) {
    const url = new URL(window.location.href);
    url.searchParams.delete('auth_token');
    url.searchParams.delete('auth_error');
    if (url.hash) {
      const nextHashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      nextHashParams.delete('auth_token');
      nextHashParams.delete('auth_error');
      const nextHash = nextHashParams.toString();
      url.hash = nextHash ? `#${nextHash}` : '';
    }
    window.history.replaceState({}, document.title, url.toString());
  }

  return { token, error };
}

export function useSupabaseAuth() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const tokenRef = useRef(null);

  const loadProfile = useCallback(async (token) => {
    if (!token) {
      setUser(null);
      setProfile(null);
      return null;
    }

    setProfileLoading(true);
    try {
      const payload = await api.get('/auth/me', token);
      setUser(payload.user ?? null);
      setProfile(payload.profile ?? null);
      setAuthError(null);
      return payload.profile ?? null;
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
        const { token: urlToken, error } = readAuthParams();
        if (!mounted) return;

        if (urlToken) {
          localStorage.setItem(TOKEN_KEY, urlToken);
        }

        if (error) {
          setAuthError(error);
        }

        const storedToken = urlToken || localStorage.getItem(TOKEN_KEY);
        tokenRef.current = storedToken;
        setSession(storedToken ? { access_token: storedToken } : null);

        if (storedToken) {
          try {
            await loadProfile(storedToken);
          } catch (profileError) {
            console.error('Profile bootstrap failed', profileError);
            localStorage.removeItem(TOKEN_KEY);
            tokenRef.current = null;
            setSession(null);
          }
        } else {
          setUser(null);
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

    return () => {
      mounted = false;
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => loadProfile(tokenRef.current), [loadProfile]);

  const signInWithGoogle = useCallback(async () => {
    const startUrl = new URL(`${api.baseUrl}/auth/google/start`, window.location.origin);
    startUrl.searchParams.set('redirect', window.location.origin);
    window.location.assign(startUrl.toString());
  }, []);

  const linkGoogleIdentity = useCallback(async () => {
    await signInWithGoogle();
  }, [signInWithGoogle]);

  const completeOnboarding = useCallback(async ({ firstName, settingsPatch = {} } = {}) => {
    const cleanName = (firstName || profile?.first_name || '').trim();
    const nextSettings = {
      ...(profile?.settings ?? {}),
      name: cleanName,
      ...settingsPatch,
      onboarded: true,
    };
    const nextProfile = {
      ...(profile ?? {}),
      first_name: cleanName,
      username: cleanName,
      settings: nextSettings,
      onboarded: true,
    };
    setProfile(nextProfile);
    return nextProfile;
  }, [profile]);

  const signOut = useCallback(async () => {
    const token = tokenRef.current;
    tokenRef.current = null;
    localStorage.removeItem(TOKEN_KEY);
    setSession(null);
    setUser(null);
    setProfile(null);
    setAuthError(null);
    if (token) {
      api.post('/auth/logout', {}, token).catch(() => {});
    }
  }, []);

  const linkedProviders = useMemo(() => (user ? ['google'] : []), [user]);

  return useMemo(() => ({
    session,
    token: session?.access_token ?? null,
    user,
    profile,
    loading,
    profileLoading,
    authError,
    linkedProviders,
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
    signInWithGoogle,
    linkGoogleIdentity,
    signOut,
    refreshProfile,
    completeOnboarding,
  ]);
}
