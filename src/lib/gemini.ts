import type { Profile } from './types';

/**
 * Client-side helper — calls our own /api/gemini route, never Google's
 * API directly. This is the only touchpoint the browser has with the
 * GenAI layer.
 */
export async function callGemini(systemInstruction: string, userPrompt: string, jsonMode = false): Promise<string> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction, userPrompt, jsonMode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Gemini request failed');
  return data.text;
}

/**
 * Shared system prompt: grounds the AI in the real household profile and
 * instructs it to only reason over numbers it's given, never invent its
 * own weather figures or override deterministic decisions.
 */
export function baseSystemPrompt(profile: Profile): string {
  const dwellingDesc =
    profile.dwelling === 'ground' ? 'ground floor unit'
    : profile.dwelling === 'independent' ? 'independent house'
    : 'upper-floor flat';

  return `You are Varsha, a monsoon safety assistant for a household located in ${profile.locationName}.
Household: ${profile.adults} adult(s), ${profile.children} child(ren), ${profile.elderly} elderly member(s), ${profile.pets} pet(s).
Dwelling type: ${dwellingDesc}.
Respond entirely in ${profile.language}, using simple, plain, everyday vocabulary — no jargon, no technical meteorology terms.
You will be given REAL weather figures already fetched from a forecast API. Only reason over the numbers you are given.
Never invent, guess, or restate different weather numbers than the ones provided. Be specific, calm, and actionable.`;
}
