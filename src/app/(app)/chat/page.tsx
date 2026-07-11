'use client';

import { useEffect, useRef, useState } from 'react';
import { useRequireProfile } from '@/lib/useRequireProfile';
import { useWeather } from '@/lib/useWeather';
import { computeRisk } from '@/lib/risk';
import { scanAlertWindows } from '@/lib/risk';
import { wmoDesc } from '@/lib/weather';
import { baseSystemPrompt, callGeminiChat, type ChatMessage } from '@/lib/gemini';
import { LoadingSpinner, ErrorMessage } from '@/components/Feedback';

function buildGroundingContext(profileLocationName: string, weather: NonNullable<ReturnType<typeof useWeather>['weather']>, risk: ReturnType<typeof computeRisk>): string {
  const c = weather.current;
  const alerts = scanAlertWindows(weather);
  const forecastSummary = weather.daily.time
    .slice(0, 7)
    .map((d, i) => `${d}: ${wmoDesc(weather.daily.weather_code[i])}, rain prob ${weather.daily.precipitation_probability_max[i]}%, rainfall ${weather.daily.precipitation_sum[i]}mm, wind ${Math.round(weather.daily.wind_speed_10m_max[i])}km/h`)
    .join('\n');
  const alertSummary = alerts.length === 0
    ? 'No alert windows detected in the next 48 hours.'
    : alerts.map((w) => `${w.severity} window from ${w.startTime} to ${w.endTime}: rain prob ${w.maxProb}%, wind ${Math.round(w.maxWind)}km/h, rainfall ${w.totalPrecip}mm`).join('\n');

  return `\n\nCURRENT REAL DATA for ${profileLocationName} (already fetched from a live forecast API — use only these numbers, never invent your own):
Current: ${wmoDesc(c.weather_code)}, ${c.temperature_2m}°C (feels ${c.apparent_temperature}°C), rainfall ${c.precipitation}mm, wind ${c.wind_speed_10m}km/h, humidity ${c.relative_humidity_2m}%
Computed household risk today: ${risk.level} (${risk.total}/100)
7-day forecast:
${forecastSummary}
Alert windows (next 48h, severity computed by rule-based code, not you):
${alertSummary}

You are answering free-form questions from this household about monsoon safety, weather, travel, or preparedness. Ground every answer in the real data above. If asked something the data above cannot answer (e.g. hyper-local flooding on a specific street, or anything outside monsoon/weather/safety topics), say so honestly rather than guessing. Keep answers conversational and concise (2-5 sentences unless more detail is clearly needed).`;
}

export default function ChatPage() {
  const { profile, ready } = useRequireProfile();
  const { weather, loading: weatherLoading, error: weatherError } = useWeather(profile?.lat, profile?.lon);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || !profile || !weather || sending) return;
    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    try {
      const risk = computeRisk(weather, profile, 0);
      const sys = baseSystemPrompt(profile) + buildGroundingContext(profile.locationName, weather, risk);
      const reply = await callGeminiChat(sys, nextMessages);
      setMessages((m) => [...m, { role: 'model', text: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get a response');
    } finally {
      setSending(false);
    }
  };

  if (!ready || !profile) return null;

  return (
    <div className="fade-in flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
      <div className="mb-3">
        <h2 className="font-display text-2xl font-bold">Ask Varsha</h2>
        <p className="text-dim text-sm">
          Chat grounded in {profile.locationName}&apos;s real current weather, forecast, and alerts.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-surface border border-border rounded-2xl p-4 space-y-3"
      >
        <div className="flex justify-start">
          <div className="max-w-[85%] bg-surface2 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm">
            Hi{profile.locationName ? `, I have your live weather for ${profile.locationName}` : ''}! Ask me anything about
            today&apos;s conditions, this week&apos;s forecast, or how to prepare — I&apos;ll answer using the real numbers, not guesses.
          </div>
        </div>

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-accent text-bg rounded-br-sm' : 'bg-surface2 text-ink rounded-bl-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-surface2 rounded-2xl rounded-bl-sm px-4 py-2.5">
              <LoadingSpinner msg="Thinking…" />
            </div>
          </div>
        )}
        {error && <ErrorMessage error={error} />}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          aria-label="Ask Varsha a question"
          placeholder={weatherLoading ? 'Loading live weather…' : weatherError ? 'Weather unavailable' : 'Ask about today’s weather, prep, or travel…'}
          value={input}
          disabled={!weather || sending}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
          className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={!weather || sending || !input.trim()}
          className="bg-accent text-bg font-semibold rounded-lg px-5 py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
