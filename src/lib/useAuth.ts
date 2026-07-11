'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'varsha_auth';

export interface AuthUser {
  name: string;
  email: string;
}

/**
 * Mock authentication — no backend, no password, stored in localStorage
 * only. This gates the app behind a lightweight "who are you" screen for
 * demo purposes; it is NOT a real security boundary (documented in README
 * as a known limitation, same spirit as the original prototype's API-key
 * disclosure).
 */
export function useAuth() {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUserState(JSON.parse(raw));
    } catch {
      // corrupted storage — treat as logged out
    }
    setLoaded(true);
  }, []);

  const login = useCallback((u: AuthUser) => {
    setUserState(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setUserState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { user, login, logout, loaded };
}
