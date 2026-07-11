import type { AlertWindow, Profile, RiskResult, TravelDecisionType, WeatherData } from './types';

/**
 * DETERMINISTIC risk scoring — pure math over real Open-Meteo values.
 * Nothing here comes from AI. Weights/thresholds are documented so they
 * can be defended in a demo/judging Q&A.
 *   precipitation probability (max, today) -> up to 35 pts
 *   precipitation sum (mm, today, capped 80mm) -> up to 30 pts
 *   wind speed (max, today, capped 70km/h) -> up to 20 pts
 *   dwelling exposure -> up to 8 pts
 *   household vulnerability (elderly/children/pets present) -> up to 7 pts
 */
export function computeRisk(weather: WeatherData, profile: Profile, dayIndex = 0): RiskResult {
  const precipProb = weather.daily.precipitation_probability_max[dayIndex] ?? 0;
  const precipSum = weather.daily.precipitation_sum[dayIndex] ?? 0;
  const windMax = weather.daily.wind_speed_10m_max[dayIndex] ?? 0;

  const precipProbScore = (precipProb / 100) * 35;
  const precipSumScore = (Math.min(precipSum, 80) / 80) * 30;
  const windScore = (Math.min(windMax, 70) / 70) * 20;

  let dwellingScore = 2;
  if (profile.dwelling === 'ground') dwellingScore = 8;
  else if (profile.dwelling === 'independent') dwellingScore = 5;

  let vulnScore = 0;
  if (profile.elderly > 0) vulnScore += 3;
  if (profile.children > 0) vulnScore += 2;
  if (profile.pets > 0) vulnScore += 2;

  const total = Math.round(precipProbScore + precipSumScore + windScore + dwellingScore + vulnScore);
  let level: RiskResult['level'] = 'Low';
  if (total >= 75) level = 'Severe';
  else if (total >= 50) level = 'High';
  else if (total >= 25) level = 'Moderate';

  return {
    total: Math.min(total, 100),
    level,
    factors: { precipProb, precipSum, windMax, dwellingScore, vulnScore },
  };
}

export function riskColor(level: RiskResult['level']): string {
  return { Low: '#22D3B4', Moderate: '#F5A623', High: '#FB7A3C', Severe: '#EF5B5B' }[level] ?? '#93A1BF';
}

/**
 * DETERMINISTIC alert-window detection over real hourly data (next 48h).
 * AI is only used afterward to phrase the wording — severity itself is
 * computed here.
 */
export function scanAlertWindows(weather: WeatherData): AlertWindow[] {
  const times = weather.hourly.time;
  const prob = weather.hourly.precipitation_probability;
  const precip = weather.hourly.precipitation;
  const wind = weather.hourly.wind_speed_10m;
  const now = new Date();
  const windows: { startIdx: number; endIdx: number }[] = [];
  let cur: { startIdx: number; endIdx: number } | null = null;

  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);
    if (t < now) continue;
    if (t.getTime() - now.getTime() > 48 * 3600 * 1000) break;
    const risky = (prob[i] ?? 0) >= 70 || (wind[i] ?? 0) >= 40 || (precip[i] ?? 0) >= 4;
    if (risky) {
      if (!cur) cur = { startIdx: i, endIdx: i };
      else cur.endIdx = i;
    } else if (cur) {
      windows.push(cur);
      cur = null;
    }
  }
  if (cur) windows.push(cur);

  return windows.map((w) => {
    const slice = <T,>(arr: T[]) => arr.slice(w.startIdx, w.endIdx + 1);
    const maxProb = Math.max(...slice(prob));
    const maxWind = Math.max(...slice(wind));
    const totalPrecip = slice(precip).reduce((a, b) => a + b, 0);
    let severity: AlertWindow['severity'] = 'Info';
    if (maxProb >= 90 || maxWind >= 60 || totalPrecip >= 20) severity = 'Warning';
    else if (maxProb >= 70 || maxWind >= 40 || totalPrecip >= 8) severity = 'Watch';
    return {
      startTime: times[w.startIdx],
      endTime: times[w.endIdx],
      maxProb,
      maxWind,
      totalPrecip: Math.round(totalPrecip * 10) / 10,
      severity,
    };
  });
}

export function severityColor(sev: AlertWindow['severity']): string {
  return { Info: '#38BDF8', Watch: '#F5A623', Warning: '#EF5B5B' }[sev] ?? '#93A1BF';
}

/**
 * DETERMINISTIC travel decision — based on the worse of the two risk
 * scores. AI only explains the reasoning in plain language afterward.
 */
export function travelDecision(originRisk: RiskResult, destRisk: RiskResult): TravelDecisionType {
  const worst = Math.max(originRisk.total, destRisk.total);
  if (worst >= 75) return 'Avoid';
  if (worst >= 50) return 'Wait';
  return 'Go';
}
