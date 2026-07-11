'use client';

import { useEffect, useState } from 'react';
import { useRequireProfile } from '@/lib/useRequireProfile';
import { useWeather } from '@/lib/useWeather';
import { scanAlertWindows, severityColor } from '@/lib/risk';
import { callGemini, baseSystemPrompt } from '@/lib/gemini';
import { LoadingSpinner, ErrorMessage, Badge } from '@/components/Feedback';
import type { AlertWindow } from '@/lib/types';

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function AlertsPage() {
  const { profile, ready } = useRequireProfile();
  const { weather, loading: weatherLoading, error: weatherError, refresh } = useWeather(profile?.lat, profile?.lon);

  const [advisories, setAdvisories] = useState<Record<number, string>>({});
  const [advisoryLoading, setAdvisoryLoading] = useState<Record<number, boolean>>({});
  const [advisoryError, setAdvisoryError] = useState<Record<number, string>>({});

  const windows: AlertWindow[] = weather ? scanAlertWindows(weather) : [];

  const generateAdvisory = async (win: AlertWindow, idx: number) => {
    if (!profile) return;
    setAdvisoryLoading((s) => ({ ...s, [idx]: true }));
    setAdvisoryError((s) => ({ ...s, [idx]: '' }));
    try {
      const sys = baseSystemPrompt(profile) +
        `\nWrite a citizen-facing advisory in 4-5 sentences. The severity level is fixed and given to you — do not change it. Explain what to expect during this window (referencing the exact numbers), why it matters for this specific household, and 2-3 concrete precautions to take before/during the window. Phrase the tone to match the severity (Info: light heads-up, Watch: prepare now, Warning: urgent action).`;
      const prompt = `Alert window: ${fmtTime(win.startTime)} to ${fmtTime(win.endTime)} in ${profile.locationName}.
Severity: ${win.severity}
Max rain probability: ${win.maxProb}%
Max wind speed: ${Math.round(win.maxWind)} km/h
Total expected rainfall in window: ${win.totalPrecip} mm

Write the advisory now.`;
      const text = await callGemini(sys, prompt);
      setAdvisories((s) => ({ ...s, [idx]: text }));
    } catch (e) {
      setAdvisoryError((s) => ({ ...s, [idx]: e instanceof Error ? e.message : 'Failed to generate advisory' }));
    } finally {
      setAdvisoryLoading((s) => ({ ...s, [idx]: false }));
    }
  };

  // Auto-generate advisories for all windows once weather loads
  useEffect(() => {
    if (!weather || !profile) return;
    const w = scanAlertWindows(weather);
    w.forEach((win, idx) => {
      if (!advisories[idx] && !advisoryLoading[idx]) generateAdvisory(win, idx);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather, profile]);

  if (!ready || !profile) return null;

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Alerts — next 48 hours</h2>
          <p className="text-dim text-sm">Detected from real hourly data · severity is rule-based · wording is AI</p>
        </div>
        <button
          onClick={() => refresh(true)}
          className="text-sm border border-border rounded-lg px-3 py-2 hover:border-accent transition-colors"
        >
          Rescan
        </button>
      </div>

      {weatherLoading && !weather && <LoadingSpinner msg="Scanning next 48 hours of real forecast data…" />}
      {weatherError && <ErrorMessage error={weatherError} prefix="Could not scan for alerts." />}

      {weather && windows.length === 0 && (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="font-display font-semibold mb-1">All clear</h3>
          <p className="text-sm text-dim">
            No significant rain, wind, or precipitation thresholds crossed in the next 48 hours for {profile.locationName}.
          </p>
          <p className="text-xs text-dim mt-3">Thresholds: rain probability ≥70%, wind ≥40 km/h, or hourly rainfall ≥4mm</p>
        </div>
      )}

      {weather && windows.length > 0 && (
        <>
          <div className="mb-1 flex items-center gap-3 text-xs text-dim">
            <Badge bg="#38BDF822" color="#38BDF8">Info</Badge>
            <Badge bg="#F5A62322" color="#F5A623">Watch</Badge>
            <Badge bg="#EF5B5B22" color="#EF5B5B">Warning</Badge>
            <span className="ml-auto">{windows.length} alert window{windows.length > 1 ? 's' : ''} detected</span>
          </div>

          {windows.map((win, idx) => (
            <div key={idx} className="bg-surface border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge bg={`${severityColor(win.severity)}22`} color={severityColor(win.severity)}>{win.severity}</Badge>
                <span className="text-xs text-dim font-mono">{fmtTime(win.startTime)} → {fmtTime(win.endTime)}</span>
              </div>
              <div className="flex gap-4 text-xs text-dim mb-3 font-mono">
                <span>🌧 {win.maxProb}% prob</span>
                <span>💨 {Math.round(win.maxWind)} km/h</span>
                <span>📏 {win.totalPrecip} mm total</span>
              </div>
              <div className="text-sm">
                {advisoryLoading[idx] && <LoadingSpinner msg="Writing advisory…" />}
                {advisoryError[idx] && <ErrorMessage error={advisoryError[idx]} />}
                {!advisoryLoading[idx] && !advisoryError[idx] && advisories[idx] && (
                  <p className="leading-relaxed fade-in">{advisories[idx]}</p>
                )}
                {!advisoryLoading[idx] && !advisoryError[idx] && !advisories[idx] && (
                  <button
                    onClick={() => generateAdvisory(win, idx)}
                    className="text-xs bg-surface2 border border-border rounded-lg px-3 py-1.5 hover:border-accent transition-colors"
                  >
                    Generate advisory
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
