import { useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../lib/api';

const TOKEN_KEY = 'lifestyle-os-token';

export function useApiAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.get('/auth/me', token);
        if (!cancelled) setUser(data.user);
      } catch {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const signUp = useCallback(async ({ email, password, username }) => {
    const data = await api.post('/auth/signup', { email, password, username });
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return useMemo(() => ({
    token,
    user,
    loading,
    signUp,
    signIn,
    signOut,
  }), [token, user, loading, signUp, signIn, signOut]);
}
