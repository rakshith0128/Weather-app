'use client';

import { useState } from 'react';
import type { AuthUser } from '@/lib/useAuth';

interface Props {
  onLogin: (user: AuthUser) => void;
}

export default function LoginForm({ onLogin }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    onLogin({ name: trimmedName, email: trimmedEmail });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs uppercase tracking-wide text-dim font-semibold">Name</label>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
          className="w-full mt-1.5 bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-dim font-semibold">Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
          className="w-full mt-1.5 bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        className="w-full bg-accent text-bg font-semibold rounded-xl py-3 text-sm hover:opacity-90 transition-opacity"
      >
        Log in →
      </button>
      <p className="text-xs text-dim text-center">
        No password needed — this is a lightweight demo login, stored only in your browser.
      </p>
    </div>
  );
}
