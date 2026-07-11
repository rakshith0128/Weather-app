'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';

/**
 * Guards a page that requires both a logged-in user and a household
 * profile. Redirects to the entry screen (login, then onboarding) if
 * either is missing. Returns `ready: false` while the redirect is in
 * flight so the page can render nothing instead of flashing empty state.
 */
export function useRequireProfile() {
  const { user, logout, loaded: authLoaded } = useAuth();
  const { profile, setProfile, clearProfile, loaded: profileLoaded } = useProfile();
  const router = useRouter();

  const loaded = authLoaded && profileLoaded;

  useEffect(() => {
    if (loaded && (!user || !profile)) router.replace('/');
  }, [loaded, user, profile, router]);

  return { profile, setProfile, clearProfile, user, logout, ready: loaded && !!user && !!profile };
}
