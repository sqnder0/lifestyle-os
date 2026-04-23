import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

import { api } from '../lib/api';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'lifestyle-os-mobile-token';

function parseAuthRedirect(url) {
  const parsed = Linking.parse(url);
  const queryParams = parsed.queryParams || {};

  const hash = typeof url === 'string' && url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const hashParams = new URLSearchParams(hash);

  return {
    token:
      (typeof queryParams.auth_token === 'string' ? queryParams.auth_token : null)
      || hashParams.get('auth_token')
      || null,
    error:
      (typeof queryParams.auth_error === 'string' ? queryParams.auth_error : null)
      || hashParams.get('auth_error')
      || null,
  };
}

export function useMobileAuth() {
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const tokenRef = useRef(null);

  const loadProfile = useCallback(async (nextToken) => {
    if (!nextToken) {
      setProfile(null);
      return null;
    }

    const payload = await api.get('/auth/me', nextToken);
    setProfile(payload.profile || null);
    return payload.profile || null;
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!active) return;

        tokenRef.current = storedToken;
        setToken(storedToken);

        if (storedToken) {
          await loadProfile(storedToken);
        }
      } catch (error) {
        if (active) {
          setAuthError(error.message || 'Failed to restore mobile session.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [loadProfile]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);

    const redirectUri = Linking.createURL('auth/callback');
    const startUrl = `${api.baseUrl}/auth/google/start?redirect=${encodeURIComponent(redirectUri)}`;

    const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);

    if (result.type !== 'success' || !result.url) {
      throw new Error('Google sign-in was canceled.');
    }

    const payload = parseAuthRedirect(result.url);
    if (payload.error) {
      throw new Error(payload.error);
    }
    if (!payload.token) {
      throw new Error('No auth token was returned from the API.');
    }

    tokenRef.current = payload.token;
    setToken(payload.token);
    await SecureStore.setItemAsync(TOKEN_KEY, payload.token);
    await loadProfile(payload.token);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    const activeToken = tokenRef.current;
    tokenRef.current = null;
    setToken(null);
    setProfile(null);
    setAuthError(null);

    await SecureStore.deleteItemAsync(TOKEN_KEY);

    if (activeToken) {
      api.post('/auth/logout', {}, activeToken).catch(() => {});
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!tokenRef.current) return null;
    return loadProfile(tokenRef.current);
  }, [loadProfile]);

  return useMemo(() => ({
    token,
    profile,
    loading,
    authError,
    signInWithGoogle,
    signOut,
    refreshProfile,
  }), [token, profile, loading, authError, signInWithGoogle, signOut, refreshProfile]);
}
