'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/lib/useProfile';
import ProfileForm from '@/components/ProfileForm';

export default function OnboardingPage() {
  const { profile, setProfile, loaded } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (loaded && profile) router.replace('/dashboard');
  }, [loaded, profile, router]);

  if (!loaded || profile) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full fade-in">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌧️</div>
          <h1 className="font-display text-3xl font-bold mb-2">Welcome to Varsha</h1>
          <p className="text-dim text-sm max-w-md mx-auto">
            Your AI-powered monsoon preparedness assistant. Set up your household in 30 seconds
            to get personalized safety guidance based on real forecast data.
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
