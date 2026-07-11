'use client';

import { useEffect, useState } from 'react';
import { useRequireProfile } from '@/lib/useRequireProfile';
import { useWeather } from '@/lib/useWeather';
import { computeRisk } from '@/lib/risk';
import { wmoDesc } from '@/lib/weather';
import { callGemini, baseSystemPrompt } from '@/lib/gemini';
import { LoadingSpinner, ErrorMessage } from '@/components/Feedback';
import type { PlanData } from '@/lib/types';

const PLAN_KEY = 'varsha_plan_data';
const CHECKED_KEY = 'varsha_plan_checked';

const GROUPS: { key: keyof PlanData; title: string; subtitle: string; color: string; icon: string }[] = [
  { key: 'do_now', title: 'Do now', subtitle: 'Next few hours', color: '#EF5B5B', icon: '🔴' },
  { key: 'do_today', title: 'Do today', subtitle: 'Before evening', color: '#F5A623', icon: '🟡' },
  { key: 'do_this_week', title: 'Do this week', subtitle: 'When you get a chance', color: '#22D3B4', icon: '🟢' },
];

export default function PlanPage() {
  const { profile, ready } = useRequireProfile();
  const { weather } = useWeather(profile?.lat, profile?.lon);

  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydrating from localStorage (an external system) after mount to avoid
    // an SSR/client markup mismatch — a blessed exception to set-state-in-effect.
    try {
      const p = localStorage.getItem(PLAN_KEY);
      const c = localStorage.getItem(CHECKED_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (p) setPlanData(JSON.parse(p));
       
      if (c) setChecked(JSON.parse(c));
    } catch {
      // corrupted storage — ignore, treat as no plan
    }
    setHydrated(true);
  }, []);

  const generatePlan = async () => {
    if (!profile || !weather) return;
    setLoading(true);
    setError(null);
    try {
      const risk = computeRisk(weather, profile, 0);
      const sys = baseSystemPrompt(profile) +
        `\nYou must respond ONLY with valid JSON matching exactly this shape: {"do_now": string[], "do_today": string[], "do_this_week": string[]}. 5-8 items per list. Each item should be one or two sentences: the concrete action plus a brief reason it matters right now, tailored to this household's composition and dwelling type. No markdown, no extra text.`;
      const forecastSummary = weather.daily.time
        .map((d, i) => `${d}: ${wmoDesc(weather.daily.weather_code[i])}, rain prob ${weather.daily.precipitation_probability_max[i]}%, rainfall ${weather.daily.precipitation_sum[i]}mm, wind ${Math.round(weather.daily.wind_speed_10m_max[i])}km/h`)
        .join('\n');
      const prompt = `Real 7-day forecast for ${profile.locationName}:\n${forecastSummary}\n\nComputed today's household risk: ${risk.level} (${risk.total}/100).\n\nGenerate a monsoon preparedness checklist grouped into do_now (urgent, next few hours), do_today, and do_this_week, tailored to this exact household and forecast.`;
      const text = await callGemini(sys, prompt, true);

      let parsed: PlanData;
      try {
        parsed = JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error('AI returned invalid format. Try regenerating.');
      }
      if (!parsed.do_now || !parsed.do_today || !parsed.do_this_week) {
        throw new Error('AI response was missing required sections. Try regenerating.');
      }

      setPlanData(parsed);
      setChecked({});
      localStorage.setItem(PLAN_KEY, JSON.stringify(parsed));
      localStorage.setItem(CHECKED_KEY, '{}');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    localStorage.setItem(CHECKED_KEY, JSON.stringify(next));
  };

  if (!ready || !profile) return null;

  const allItems = planData ? [...planData.do_now, ...planData.do_today, ...planData.do_this_week] : [];
  const total = allItems.length;
  const doneCount = Object.values(checked).filter(Boolean).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Preparedness plan</h2>
          <p className="text-dim text-sm">AI checklist grounded in your real 7-day forecast and household profile.</p>
        </div>
        <button
          onClick={generatePlan}
          disabled={loading || !weather}
          className="text-sm bg-accent text-bg font-semibold rounded-lg px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {planData ? 'Regenerate' : 'Generate plan'}
        </button>
      </div>

      {planData && total > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-dim font-semibold uppercase tracking-wide">Progress</span>
            <span className="text-sm font-mono font-semibold" style={{ color: pct === 100 ? '#22D3B4' : '#E8EDF7' }}>
              {doneCount}/{total} done{pct === 100 ? ' ✓' : ''}
            </span>
          </div>
          <div className="h-2 bg-surface2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #22D3B4, #38BDF8)' }}
            />
          </div>
        </div>
      )}

      {loading && <LoadingSpinner msg="Building your plan from the real 7-day forecast…" />}
      {error && <ErrorMessage error={error} />}

      {!hydrated ? null : !planData && !loading ? (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm text-dim mb-2">No plan yet.</p>
          <p className="text-sm text-dim">
            {weather ? 'Click "Generate plan" to create one from today\'s real forecast.' : 'Loading forecast…'}
          </p>
        </div>
      ) : planData && !loading ? (
        <div className="grid sm:grid-cols-3 gap-4">
          {GROUPS.map((g) => (
            <div key={g.key} className="bg-surface border border-border rounded-2xl p-4 slide-up">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                <span>{g.icon}</span>
                <div>
                  <h3 className="font-display font-semibold text-sm">{g.title}</h3>
                  <p className="text-xs text-dim">{g.subtitle}</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {(planData[g.key] ?? []).length === 0 ? (
                  <p className="text-xs text-dim italic">Nothing here.</p>
                ) : (
                  planData[g.key].map((item, i) => {
                    const id = `${g.key}_${i}`;
                    const isChecked = !!checked[id];
                    return (
                      <label key={id} className="flex items-start gap-2.5 text-sm cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(id)}
                          className="mt-0.5 flex-shrink-0 accent-accent w-4 h-4 cursor-pointer"
                        />
                        <span className={isChecked ? 'line-through text-dim transition-colors' : 'transition-colors group-hover:text-white'}>
                          {item}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
