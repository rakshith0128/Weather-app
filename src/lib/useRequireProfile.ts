'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from './useProfile';

/**
 * Guards a page that requires a household profile. Redirects to the
 * onboarding screen if none is set yet. Returns `ready: false` while the
 * redirect is in flight so the page can render nothing instead of
 * flashing empty state.
 */
export function useRequireProfile() {
  const { profile, setProfile, clearProfile, loaded } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (loaded && !profile) router.replace('/');
  }, [loaded, profile, router]);

  return { profile, setProfile, clearProfile, ready: loaded && !!profile };
}
