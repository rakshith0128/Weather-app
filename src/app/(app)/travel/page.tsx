'use client';

import { useEffect, useState } from 'react';
import { useRequireProfile } from '@/lib/useRequireProfile';
import { geocodeLocation, fetchWeather, wmoIcon } from '@/lib/weather';
import { computeRisk, riskColor, travelDecision } from '@/lib/risk';
import { callGemini, baseSystemPrompt } from '@/lib/gemini';
import { LoadingSpinner, ErrorMessage, Badge } from '@/components/Feedback';
import type { GeocodeResult, RiskResult, TravelDecisionType, WeatherData } from '@/lib/types';

interface TravelResult {
  origin: GeocodeResult;
  dest: GeocodeResult;
  originWeather: WeatherData;
  destWeather: WeatherData;
  originRisk: RiskResult;
  destRisk: RiskResult;
  decision: TravelDecisionType;
}

const DECISION_COLOR: Record<TravelDecisionType, string> = { Go: '#22D3B4', Wait: '#F5A623', Avoid: '#EF5B5B' };
const DECISION_ICON: Record<TravelDecisionType, string> = { Go: '✅', Wait: '⏳', Avoid: '🚫' };

export default function TravelPage() {
  const { profile, ready } = useRequireProfile();
  const [originQ, setOriginQ] = useState('');
  const [destQ, setDestQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TravelResult | null>(null);

  const [explanation, setExplanation] = useState('');
  const [explLoading, setExplLoading] = useState(false);
  const [explError, setExplError] = useState<string | null>(null);

  useEffect(() => {
    // Syncing from profile (loaded asynchronously from localStorage) once
    // it becomes available — profile is null on first render, so this
    // can't be a plain useState initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profile) setOriginQ(profile.locationName);
  }, [profile]);

  const checkTravel = async () => {
    if (!profile) return;
    const o = originQ.trim();
    const d = destQ.trim();
    if (!o || !d) {
      setError('Please enter both an origin and a destination.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setExplanation('');
    setExplError(null);
    try {
      const [originResults, destResults] = await Promise.all([geocodeLocation(o), geocodeLocation(d)]);
      if (originResults.length === 0) throw new Error(`Could not find "${o}". Try a more specific name.`);
      if (destResults.length === 0) throw new Error(`Could not find "${d}". Try a more specific name.`);
      const origin = originResults[0];
      const dest = destResults[0];
      const [originWeather, destWeather] = await Promise.all([
        fetchWeather(origin.latitude, origin.longitude),
        fetchWeather(dest.latitude, dest.longitude),
      ]);
      const originRisk = computeRisk(originWeather, profile, 0);
      const destRisk = computeRisk(destWeather, profile, 0);
      const decision = travelDecision(originRisk, destRisk);
      const res: TravelResult = { origin, dest, originWeather, destWeather, originRisk, destRisk, decision };
      setResult(res);
      generateExplanation(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to check travel conditions');
    } finally {
      setLoading(false);
    }
  };

  const generateExplanation = async (res: TravelResult) => {
    if (!profile) return;
    setExplLoading(true);
    setExplError(null);
    try {
      const sys = baseSystemPrompt(profile) +
        `\nThe Go/Wait/Avoid decision is already fixed — do not change it. Explain the reasoning in 4-5 sentences: compare conditions at both ends referencing the real numbers given, note anything to prepare for or watch out for during the trip if travel proceeds, and mention any packing or timing suggestion appropriate to the conditions.`;
      const prompt = `Trip: ${res.origin.name} → ${res.dest.name}.
Decision (fixed): ${res.decision}
Origin: risk ${res.originRisk.level} (${res.originRisk.total}/100) — rain prob ${res.originRisk.factors.precipProb}%, rainfall ${res.originRisk.factors.precipSum}mm, wind ${Math.round(res.originRisk.factors.windMax)}km/h
Destination: risk ${res.destRisk.level} (${res.destRisk.total}/100) — rain prob ${res.destRisk.factors.precipProb}%, rainfall ${res.destRisk.factors.precipSum}mm, wind ${Math.round(res.destRisk.factors.windMax)}km/h

Explain the decision now.`;
      const text = await callGemini(sys, prompt);
      setExplanation(text);
    } catch (e) {
      setExplError(e instanceof Error ? e.message : 'Failed to generate explanation');
    } finally {
      setExplLoading(false);
    }
  };

  if (!ready || !profile) return null;

  return (
    <div className="fade-in space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold">Travel advisory</h2>
        <p className="text-dim text-sm">Real forecast at both ends → deterministic Go/Wait/Avoid → AI explanation</p>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="travel-origin" className="text-xs uppercase tracking-wide text-dim font-semibold">From</label>
            <input
              id="travel-origin"
              type="text"
              placeholder="Origin city/area"
              value={originQ}
              onChange={(e) => setOriginQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); checkTravel(); } }}
              className="w-full mt-1.5 bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="travel-dest" className="text-xs uppercase tracking-wide text-dim font-semibold">To</label>
            <input
              id="travel-dest"
              type="text"
              placeholder="Destination city/area"
              value={destQ}
              onChange={(e) => setDestQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); checkTravel(); } }}
              className="w-full mt-1.5 bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
            />
          </div>
        </div>
        <button
          onClick={checkTravel}
          disabled={loading}
          className="w-full sm:w-auto bg-accent text-bg font-semibold rounded-lg px-5 py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Check travel conditions
        </button>
      </div>

      {loading && <LoadingSpinner msg="Geocoding locations and fetching real forecasts for both…" />}
      {error && <ErrorMessage error={error} />}

      {result && (
        <div className="bg-surface border border-border rounded-2xl p-5 slide-up">
          <div className="flex items-center justify-center mb-5">
            <div className="text-center flex-1">
              <div className="text-xs text-dim mb-1">{result.origin.name}</div>
              <div className="text-3xl mb-1">{wmoIcon(result.originWeather.current.weather_code)}</div>
              <div className="font-mono text-sm">{Math.round(result.originWeather.current.temperature_2m)}°C</div>
              <div className="mt-1 flex justify-center">
                <Badge bg={`${riskColor(result.originRisk.level)}22`} color={riskColor(result.originRisk.level)}>
                  {result.originRisk.level} ({result.originRisk.total})
                </Badge>
              </div>
            </div>
            <div className="px-6 text-center">
              <div className="text-dim text-xs mb-1">→</div>
              <div
                className="font-display font-bold text-xl px-5 py-2 rounded-full"
                style={{ background: `${DECISION_COLOR[result.decision]}22`, color: DECISION_COLOR[result.decision] }}
              >
                {DECISION_ICON[result.decision]} {result.decision}
              </div>
              <div className="text-dim text-xs mt-1">→</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-xs text-dim mb-1">{result.dest.name}</div>
              <div className="text-3xl mb-1">{wmoIcon(result.destWeather.current.weather_code)}</div>
              <div className="font-mono text-sm">{Math.round(result.destWeather.current.temperature_2m)}°C</div>
              <div className="mt-1 flex justify-center">
                <Badge bg={`${riskColor(result.destRisk.level)}22`} color={riskColor(result.destRisk.level)}>
                  {result.destRisk.level} ({result.destRisk.total})
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div className="bg-surface2 rounded-xl p-3 text-xs">
              <div className="font-semibold mb-1">{result.origin.name}</div>
              <div className="text-dim space-y-0.5">
                <div>Rain: {result.originRisk.factors.precipProb}% chance, {result.originRisk.factors.precipSum}mm expected</div>
                <div>Wind: {Math.round(result.originRisk.factors.windMax)} km/h</div>
              </div>
            </div>
            <div className="bg-surface2 rounded-xl p-3 text-xs">
              <div className="font-semibold mb-1">{result.dest.name}</div>
              <div className="text-dim space-y-0.5">
                <div>Rain: {result.destRisk.factors.precipProb}% chance, {result.destRisk.factors.precipSum}mm expected</div>
                <div>Wind: {Math.round(result.destRisk.factors.windMax)} km/h</div>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            {explLoading && <LoadingSpinner msg="Generating explanation…" />}
            {explError && <ErrorMessage error={explError} />}
            {!explLoading && !explError && explanation && (
              <p className="leading-relaxed text-sm fade-in">{explanation}</p>
            )}
            {!explLoading && !explError && !explanation && (
              <button
                onClick={() => generateExplanation(result)}
                className="text-xs bg-surface2 border border-border rounded-lg px-3 py-1.5 hover:border-accent transition-colors"
              >
                Explain reasoning
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
