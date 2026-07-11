'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireProfile } from '@/lib/useRequireProfile';
import { EMERGENCY_CONTACTS } from '@/lib/constants';
import ProfileForm from '@/components/ProfileForm';

export default function SettingsPage() {
  const { profile, setProfile, clearProfile, user, logout, ready } = useRequireProfile();
  const router = useRouter();
  const [keyStatus, setKeyStatus] = useState<'checking' | 'ok' | 'missing'>('checking');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Cheap way to confirm the server has a key configured: a HEAD-ish probe
    // via a minimal Gemini call would burn quota, so instead just ask the
    // route itself — a request with no body returns 400 (bad request) if the
    // key exists, or 500 with our explicit "missing key" message if not.
    fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.status === 500 && data.error?.includes('GEMINI_API_KEY')) setKeyStatus('missing');
        else setKeyStatus('ok');
      })
      .catch(() => setKeyStatus('missing'));
  }, []);

  if (!ready || !profile || !user) return null;

  return (
    <div className="fade-in max-w-xl space-y-8">
      <div>
        <h2 className="font-display text-xl font-bold mb-1">Account</h2>
        <p className="text-dim text-sm mb-3">Signed in as {user.name} ({user.email}).</p>
        <div className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between">
          <div className="text-sm">
            <div className="font-semibold">{user.name}</div>
            <div className="text-dim text-xs">{user.email}</div>
          </div>
          <button
            onClick={() => {
              logout();
              router.replace('/');
            }}
            className="text-xs border border-border rounded-lg px-3 py-1.5 hover:border-danger hover:text-danger transition-colors"
          >
            Log out
          </button>
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold mb-1">Gemini API key</h2>
        <p className="text-dim text-sm mb-3">
          Configured server-side via <code className="text-accent">GEMINI_API_KEY</code> in <code>.env.local</code> —
          never sent to or visible in the browser. Restart the dev server after changing it.
        </p>
        <div className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-2">
          {keyStatus === 'checking' && <span className="text-sm text-dim">Checking…</span>}
          {keyStatus === 'ok' && (
            <>
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-sm text-accent">Key configured — AI features are enabled</span>
            </>
          )}
          {keyStatus === 'missing' && (
            <>
              <span className="w-2 h-2 rounded-full bg-danger" />
              <span className="text-sm text-danger">No key found — add GEMINI_API_KEY to .env.local and restart the server</span>
            </>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold mb-1">Household profile</h2>
        <p className="text-dim text-sm mb-3">Update your location or household details — every screen recalculates from this.</p>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <ProfileForm
            initial={profile}
            submitLabel="Save changes"
            onSave={(p) => {
              setProfile(p);
              setSaved(true);
              setTimeout(() => setSaved(false), 2500);
            }}
          />
          {saved && <p className="text-sm text-accent mt-3">✓ Profile saved</p>}
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold mb-1">Emergency contacts</h2>
        <p className="text-dim text-sm mb-3">Key numbers for monsoon emergencies in India.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {EMERGENCY_CONTACTS.map((c) => (
            <a
              key={c.number}
              href={`tel:${c.number}`}
              className="bg-surface border border-border rounded-2xl p-4 text-center hover:border-accent transition-colors block"
            >
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className="text-xs text-dim">{c.name}</div>
              <div className="font-mono text-sm font-semibold text-accent mt-0.5">{c.number}</div>
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-6 space-y-3">
        <p className="text-xs text-dim">
          Varsha uses real forecast data from Open-Meteo and Gemini AI for natural language guidance.
          Risk levels, alert severity, and travel decisions are computed deterministically — never by AI.
        </p>
        <button
          onClick={() => {
            clearProfile();
            router.replace('/');
          }}
          className="text-xs text-danger hover:underline"
        >
          Reset household profile and start over
        </button>
      </div>
    </div>
  );
}
