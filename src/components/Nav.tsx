'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const TABS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/plan', label: 'Prep Plan', icon: '📋' },
  { href: '/alerts', label: 'Alerts', icon: '⚠️' },
  { href: '/travel', label: 'Travel', icon: '🚗' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-border">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between py-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            <path
              d="M17 3C17 3 8 14 8 21C8 25.9706 12.0294 30 17 30C21.9706 30 26 25.9706 26 21C26 14 17 3 17 3Z"
              stroke="#22D3B4" strokeWidth="2" fill="#22D3B415"
            />
          </svg>
          <div>
            <h1 className="font-display font-semibold text-xl tracking-tight text-ink">Varsha</h1>
            <p className="text-xs text-dim -mt-0.5">Monsoon readiness · live forecasts</p>
          </div>
        </Link>

        <nav className="hidden sm:flex gap-1">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
                pathname === t.href
                  ? 'bg-surface2 text-ink border-accent'
                  : 'border-transparent text-dim hover:text-ink hover:bg-surface2/60'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="sm:hidden text-dim border border-border rounded-lg px-3 py-2 text-sm"
          aria-label="Toggle menu"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5h12M3 9h12M3 13h12" />
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <nav className="sm:hidden flex flex-col gap-1 px-4 py-3 border-t border-border">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              onClick={() => setMobileOpen(false)}
              className={`text-sm px-3 py-2.5 rounded-lg text-left ${
                pathname === t.href ? 'bg-surface2 text-ink' : 'text-dim'
              }`}
            >
              {t.icon} {t.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
