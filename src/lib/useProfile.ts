'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Profile } from './types';

const STORAGE_KEY = 'varsha_profile';

/**
 * Profile is the household setup (location, members, dwelling, language).
 * Persisted to localStorage so it survives reloads — no backend, no
 * server-side session, matching the "no server/database" architecture.
 */
export function useProfile() {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Hydrating from localStorage (an external system) after mount to avoid
    // an SSR/client markup mismatch — a blessed exception to set-state-in-effect.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setProfileState(JSON.parse(raw));
    } catch {
      // corrupted storage — treat as no profile
    }
     
    setLoaded(true);
  }, []);

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    // Clear any cached AI output tied to the previous location/household
    // so stale guidance never lingers after a profile change.
    localStorage.removeItem('varsha_today_action');
    localStorage.removeItem('varsha_plan_data');
    localStorage.removeItem('varsha_plan_checked');
  }, []);

  const clearProfile = useCallback(() => {
    setProfileState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { profile, setProfile, clearProfile, loaded };
}
