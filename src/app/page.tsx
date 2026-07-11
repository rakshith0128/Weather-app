'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { useProfile } from '@/lib/useProfile';
import LoginForm from '@/components/LoginForm';
import ProfileForm from '@/components/ProfileForm';

export default function EntryPage() {
  const { user, login, loaded: authLoaded } = useAuth();
  const { profile, setProfile, loaded: profileLoaded } = useProfile();
  const router = useRouter();

  const loaded = authLoaded && profileLoaded;

  useEffect(() => {
    if (loaded && user && profile) router.replace('/dashboard');
  }, [loaded, user, profile, router]);

  if (!loaded || (user && profile)) return null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-sm w-full fade-in">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🌧️</div>
            <h1 className="font-display text-3xl font-bold mb-2">Varsha</h1>
            <p className="text-dim text-sm">Sign in to set up your monsoon preparedness plan.</p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-6">
            <LoginForm onLogin={login} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full fade-in">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌧️</div>
          <h1 className="font-display text-3xl font-bold mb-2">Welcome, {user.name}</h1>
          <p className="text-dim text-sm max-w-md mx-auto">
            Set up your household in 30 seconds to get personalized safety guidance based on real forecast data.
          </p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-6">
          <ProfileForm
            submitLabel="Get started →"
            onSave={(p) => {
              setProfile(p);
              router.push('/dashboard');
            }}
          />
        </div>
      </div>
    </div>
  );
}
