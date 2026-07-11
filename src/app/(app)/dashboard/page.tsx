'use client';

import { useEffect, useState } from 'react';
import { useRequireProfile } from '@/lib/useRequireProfile';
import { useWeather } from '@/lib/useWeather';
import { computeRisk, riskColor } from '@/lib/risk';
import { wmoDesc, wmoIcon, isRainy } from '@/lib/weather';
import { callGemini, baseSystemPrompt } from '@/lib/gemini';
import { EMERGENCY_CONTACTS } from '@/lib/constants';
import RiskGauge from '@/components/RiskGauge';
import FactorBar from '@/components/FactorBar';
import { LoadingSpinner, ErrorMessage, Badge } from '@/components/Feedback';

const STORAGE_KEY = 'varsha_today_action';

export default function DashboardPage() {
  const { profile, ready } = useRequireProfile();
  const { weather, fetchedAt, loading, error, refresh } = useWeather(profile?.lat, profile?.lon);

  const [todayAction, setTodayAction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    // Hydrating from localStorage (an external system) after mount to avoid
    // an SSR/client markup mismatch — a blessed exception to set-state-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayAction(localStorage.getItem(STORAGE_KEY) ?? '');
  }, []);

  const generateGuidance = async () => {
    if (!profile || !weather) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const risk = computeRisk(weather, profile, 0);
      const c = weather.current;
      const sys = baseSystemPrompt(profile);
      const prompt = `Today's real forecast for ${profile.locationName}:
- Condition: ${wmoDesc(c.weather_code)}
- Temperature: ${c.temperature_2m}°C (feels ${c.apparent_temperature}°C)
- Current rainfall: ${c.precipitation} mm, Wind: ${c.wind_speed_10m} km/h, Humidity: ${c.relative_humidity_2m}%
- Today's max rain probability: ${risk.factors.precipProb}%, expected rainfall total: ${risk.factors.precipSum}mm, max wind: ${Math.round(risk.factors.windMax)}km/h
- Computed household risk level: ${risk.level} (${risk.total}/100)

Write today's guidance for this household in 4-6 sentences: start with one clear headline recommendation, then explain briefly why (referencing the exact numbers above), then give 2-3 concrete supporting actions (specific times, specific tasks) tailored to this household's composition and dwelling type. Be specific and practical, not generic filler.`;
      const text = await callGemini(sys, prompt);
      setTodayAction(text);
      localStorage.setItem(STORAGE_KEY, text);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Failed to generate guidance');
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-generate once weather loads, if nothing cached yet — reacting to an
  // external data source (the weather fetch) becoming available.
  useEffect(() => {
    if (weather && profile && !todayAction && !aiLoading && !aiError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      generateGuidance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather, profile]);

  if (!ready || !profile) return null;

  const risk = weather ? computeRisk(weather, profile, 0) : null;
  const c = weather?.current;

  return (
    <div className="fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">{profile.locationName}</h2>
          <p className="text-dim text-sm">
            {loading ? 'Loading real forecast…' :
              fetchedAt ? `Live data · ${new Date(fetchedAt).toLocaleTimeString()} · ${weather?.timezone}` : ''}
          </p>
        </div>
        <button
          onClick={() => { setTodayAction(''); localStorage.removeItem(STORAGE_KEY); refresh(true); }}
          className="text-sm border border-border rounded-lg px-3 py-2 hover:border-accent transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 4v5h5M20 20v-5h-5M20.49 9A9 9 0 0 0 5.64 5.64L4 4m16 16l-1.64-1.64A9 9 0 0 1 3.51 15" />
          </svg>
          Refresh
        </button>
      </div>

      {loading && !weather && <LoadingSpinner msg="Fetching live weather data…" />}
      {error && <ErrorMessage error={error} prefix="Could not load weather data." />}

      {weather && risk && c && (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            {/* Current weather */}
            <div className="bg-surface border border-border rounded-2xl p-5 sm:col-span-2 relative overflow-hidden">
              {isRainy(c.weather_code) && <RainOverlay />}
              <div className="relative z-10">
                <div className="flex items-center gap-5 mb-4">
                  <div className="text-6xl">{wmoIcon(c.weather_code)}</div>
                  <div>
                    <div className="font-mono text-4xl font-semibold">{Math.round(c.temperature_2m)}°C</div>
                    <div className="text-dim text-sm mt-0.5">{wmoDesc(c.weather_code)} · feels {Math.round(c.apparent_temperature)}°C</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-surface2 rounded-xl p-3">
                    <div className="text-dim text-xs mb-0.5">Rainfall</div>
                    <div className="font-mono font-semibold">{c.precipitation} mm</div>
                  </div>
                  <div className="bg-surface2 rounded-xl p-3">
                    <div className="text-dim text-xs mb-0.5">Wind</div>
                    <div className="font-mono font-semibold">{Math.round(c.wind_speed_10m)} km/h</div>
                  </div>
                  <div className="bg-surface2 rounded-xl p-3">
                    <div className="text-dim text-xs mb-0.5">Humidity</div>
                    <div className="font-mono font-semibold">{c.relative_humidity_2m}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk gauge */}
            <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col items-center">
              <div className="text-xs uppercase tracking-wide text-dim mb-2 font-semibold">Today&apos;s risk</div>
              <RiskGauge score={risk.total} color={riskColor(risk.level)} />
              <div className="font-display font-bold text-lg mt-1" style={{ color: riskColor(risk.level) }}>{risk.level}</div>
              <div className="w-full mt-4 px-1">
                <FactorBar label="Rain chance" value={`${risk.factors.precipProb}%`} pct={risk.factors.precipProb} color="#38BDF8" />
                <FactorBar label="Rainfall" value={`${risk.factors.precipSum}mm`} pct={(risk.factors.precipSum / 80) * 100} color="#22D3B4" />
                <FactorBar label="Wind" value={`${Math.round(risk.factors.windMax)}km/h`} pct={(risk.factors.windMax / 70) * 100} color="#F5A623" />
                <FactorBar label="Home exposure" value={`${risk.factors.dwellingScore}/8`} pct={(risk.factors.dwellingScore / 8) * 100} color="#FB7A3C" />
                <FactorBar label="Vulnerability" value={`${risk.factors.vulnScore}/7`} pct={(risk.factors.vulnScore / 7) * 100} color="#EF5B5B" />
              </div>
            </div>
          </div>

          {/* 7-day forecast */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wide text-dim mb-3 font-semibold">7-day forecast</div>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {weather.daily.time.map((d, i) => {
                const dayRisk = computeRisk(weather, profile, i);
                return (
                  <div key={d} className="flex-shrink-0 w-24 text-center bg-surface2 rounded-xl p-3 border border-transparent hover:border-border transition-colors">
                    <div className="text-xs text-dim font-medium">
                      {i === 0 ? 'Today' : new Date(d).toLocaleDateString(undefined, { weekday: 'short' })}
                    </div>
                    <div className="text-2xl my-1">{wmoIcon(weather.daily.weather_code[i])}</div>
                    <div className="text-xs font-mono">
                      {Math.round(weather.daily.temperature_2m_max[i])}° / {Math.round(weather.daily.temperature_2m_min[i])}°
                    </div>
                    <div className="text-xs font-mono mt-0.5" style={{ color: riskColor(dayRisk.level) }}>
                      {weather.daily.precipitation_probability_max[i]}% 🌧
                    </div>
                    <div className="mt-1 flex justify-center">
                      <Badge bg={`${riskColor(dayRisk.level)}22`} color={riskColor(dayRisk.level)}>{dayRisk.level}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI guidance */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <h3 className="font-display font-semibold">Today&apos;s guidance</h3>
                <Badge bg="var(--color-surface2)" color="var(--color-dim)">AI-generated</Badge>
              </div>
              <button
                onClick={generateGuidance}
                disabled={aiLoading}
                className="text-sm bg-accent text-bg font-semibold rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {todayAction ? 'Regenerate' : 'Generate'}
              </button>
            </div>
            {aiLoading && <LoadingSpinner msg="Generating personalized guidance…" />}
            {aiError && <ErrorMessage error={aiError} />}
            {!aiLoading && !aiError && todayAction && (
              <div className="text-sm leading-relaxed whitespace-pre-wrap fade-in">{todayAction}</div>
            )}
            {!aiLoading && !aiError && !todayAction && (
              <p className="text-sm text-dim">Generating personalized guidance…</p>
            )}
          </div>

          {/* Emergency contacts */}
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {EMERGENCY_CONTACTS.map((c) => (
              <a
                key={c.number}
                href={`tel:${c.number}`}
                className="flex-shrink-0 bg-surface border border-border rounded-2xl px-4 py-3 flex items-center gap-2 hover:border-accent transition-colors"
              >
                <span>{c.icon}</span>
                <div>
                  <div className="text-xs text-dim">{c.name}</div>
                  <div className="font-mono text-xs font-semibold text-accent">{c.number}</div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RainOverlay() {
  // Computed once on mount via lazy initializer, not on every render — the
  // positions are decorative and don't need to change on re-render.
  const [drops] = useState(() =>
    Array.from({ length: 20 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 2,
      dur: 0.6 + Math.random() * 0.8,
      h: 15 + Math.random() * 25,
    }))
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {drops.map((d, i) => (
        <div
          key={i}
          className="absolute w-px"
          style={{
            left: `${d.left}%`,
            top: '-10px',
            height: `${d.h}px`,
            background: 'linear-gradient(to bottom, transparent, #22D3B466)',
            animation: `fall ${d.dur}s linear infinite`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes fall {
          from { transform: translateY(-10px); opacity: 0; }
          15% { opacity: 1; }
          to { transform: translateY(200px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
