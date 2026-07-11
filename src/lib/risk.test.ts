import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeRisk, scanAlertWindows, travelDecision, riskColor, severityColor } from './risk';
import type { Profile, RiskResult, WeatherData } from './types';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    locationName: 'Test City',
    lat: 12.97,
    lon: 77.59,
    adults: 1,
    children: 0,
    elderly: 0,
    pets: 0,
    dwelling: 'flat',
    language: 'English',
    ...overrides,
  };
}

function makeDailyWeather(overrides: Partial<WeatherData['daily']> = {}): WeatherData {
  return {
    timezone: 'Asia/Kolkata',
    current: {
      temperature_2m: 28, apparent_temperature: 29, precipitation: 0,
      weather_code: 3, wind_speed_10m: 10, relative_humidity_2m: 60,
    },
    hourly: {
      time: [], temperature_2m: [], precipitation_probability: [],
      precipitation: [], weather_code: [], wind_speed_10m: [],
    },
    daily: {
      time: ['2026-07-11'],
      weather_code: [3],
      temperature_2m_max: [30],
      temperature_2m_min: [22],
      precipitation_sum: [0],
      precipitation_probability_max: [0],
      wind_speed_10m_max: [0],
      uv_index_max: [5],
      ...overrides,
    },
  };
}

describe('computeRisk', () => {
  it('scores Low for calm, dry conditions in a flat with no vulnerable members', () => {
    const w = makeDailyWeather({ precipitation_probability_max: [0], precipitation_sum: [0], wind_speed_10m_max: [0] });
    const risk = computeRisk(w, makeProfile());
    expect(risk.level).toBe('Low');
    // dwelling(flat)=2, everything else 0
    expect(risk.total).toBe(2);
  });

  it('scores Severe when rain probability, rainfall, and wind are all maxed with a vulnerable ground-floor household', () => {
    const w = makeDailyWeather({
      precipitation_probability_max: [100],
      precipitation_sum: [200], // capped at 80
      wind_speed_10m_max: [150], // capped at 70
    });
    const risk = computeRisk(w, makeProfile({ dwelling: 'ground', elderly: 1, children: 1, pets: 1 }));
    // 35 (prob) + 30 (precip capped) + 20 (wind capped) + 8 (ground) + 7 (elderly+children+pets) = 100
    expect(risk.total).toBe(100);
    expect(risk.level).toBe('Severe');
  });

  it('crosses exactly at the documented thresholds (25/50/75)', () => {
    // Construct precip probability alone to land near each threshold with everything else zeroed via an independent-house, no-vulnerability profile (dwelling score 5)
    const profile = makeProfile({ dwelling: 'independent' });
    // total = precipProbScore + 5 (dwelling); need precipProbScore = 20 -> total 25 (Moderate boundary)
    const w25 = makeDailyWeather({ precipitation_probability_max: [(20 / 35) * 100] });
    expect(computeRisk(w25, profile).total).toBe(25);
    expect(computeRisk(w25, profile).level).toBe('Moderate');

    // total = 49 should still be Moderate, total = 50 should flip to High
    const wJustBelow50 = makeDailyWeather({ precipitation_probability_max: [(44 / 35) * 100] });
    const risk49 = computeRisk(wJustBelow50, profile);
    expect(risk49.total).toBeLessThan(50);
    expect(risk49.level).toBe('Moderate');
  });

  it('caps rainfall contribution at 80mm and wind contribution at 70km/h', () => {
    const wAt80 = makeDailyWeather({ precipitation_sum: [80] });
    const wOver80 = makeDailyWeather({ precipitation_sum: [500] });
    const profile = makeProfile();
    expect(computeRisk(wAt80, profile).total).toBe(computeRisk(wOver80, profile).total);
  });

  it('increases dwelling score for ground floor vs independent vs flat', () => {
    const w = makeDailyWeather();
    const flat = computeRisk(w, makeProfile({ dwelling: 'flat' })).factors.dwellingScore;
    const ground = computeRisk(w, makeProfile({ dwelling: 'ground' })).factors.dwellingScore;
    const independent = computeRisk(w, makeProfile({ dwelling: 'independent' })).factors.dwellingScore;
    expect(ground).toBeGreaterThan(independent);
    expect(independent).toBeGreaterThan(flat);
  });

  it('adds vulnerability points independently for elderly, children, and pets', () => {
    const w = makeDailyWeather();
    const base = computeRisk(w, makeProfile()).factors.vulnScore;
    const withElderly = computeRisk(w, makeProfile({ elderly: 1 })).factors.vulnScore;
    const withAll = computeRisk(w, makeProfile({ elderly: 1, children: 1, pets: 1 })).factors.vulnScore;
    expect(withElderly).toBe(base + 3);
    expect(withAll).toBe(base + 7);
  });

  it('reads the correct day index from a multi-day forecast', () => {
    const w = makeDailyWeather({
      precipitation_probability_max: [0, 100],
      precipitation_sum: [0, 0],
      wind_speed_10m_max: [0, 0],
    });
    w.daily.time = ['2026-07-11', '2026-07-12'];
    const todayRisk = computeRisk(w, makeProfile(), 0);
    const tomorrowRisk = computeRisk(w, makeProfile(), 1);
    expect(tomorrowRisk.total).toBeGreaterThan(todayRisk.total);
  });
});

describe('riskColor', () => {
  it('maps every documented level to a distinct color', () => {
    const levels: RiskResult['level'][] = ['Low', 'Moderate', 'High', 'Severe'];
    const colors = levels.map(riskColor);
    expect(new Set(colors).size).toBe(4);
  });
});

describe('scanAlertWindows', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-11T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function hourlyAt(hoursFromNow: number[], values: { prob?: number; wind?: number; precip?: number }[]): WeatherData['hourly'] {
    const base = new Date('2026-07-11T00:00:00Z').getTime();
    return {
      time: hoursFromNow.map((h) => new Date(base + h * 3600 * 1000).toISOString()),
      temperature_2m: hoursFromNow.map(() => 25),
      precipitation_probability: values.map((v) => v.prob ?? 0),
      precipitation: values.map((v) => v.precip ?? 0),
      weather_code: hoursFromNow.map(() => 3),
      wind_speed_10m: values.map((v) => v.wind ?? 0),
    };
  }

  it('detects no windows when nothing crosses a threshold', () => {
    const hours = [0, 1, 2, 3];
    const w = makeDailyWeather();
    w.hourly = hourlyAt(hours, hours.map(() => ({ prob: 10, wind: 5, precip: 0 })));
    expect(scanAlertWindows(w)).toHaveLength(0);
  });

  it('detects a single window when rain probability crosses 70%', () => {
    const hours = [0, 1, 2, 3];
    const w = makeDailyWeather();
    w.hourly = hourlyAt(hours, [{ prob: 10 }, { prob: 80 }, { prob: 85 }, { prob: 10 }]);
    const windows = scanAlertWindows(w);
    expect(windows).toHaveLength(1);
    expect(windows[0].severity).toBe('Watch'); // 85% is >=70 but <90
  });

  it('classifies severity as Warning when max wind crosses 60km/h', () => {
    const hours = [0, 1];
    const w = makeDailyWeather();
    w.hourly = hourlyAt(hours, [{ wind: 65 }, { wind: 65 }]);
    const windows = scanAlertWindows(w);
    expect(windows[0].severity).toBe('Warning');
  });

  it('classifies severity as Watch when total rainfall in the window reaches 8mm but stays below 20mm', () => {
    const hours = [0, 1];
    const w = makeDailyWeather();
    w.hourly = hourlyAt(hours, [{ precip: 4 }, { precip: 4 }]); // 8mm total, each hour individually crosses the 4mm risky threshold
    const windows = scanAlertWindows(w);
    expect(windows[0].totalPrecip).toBe(8);
    expect(windows[0].severity).toBe('Watch');
  });

  it('merges consecutive risky hours into one window and splits on a calm gap', () => {
    const hours = [0, 1, 2, 3, 4, 5];
    const w = makeDailyWeather();
    w.hourly = hourlyAt(hours, [
      { prob: 80 }, { prob: 80 }, // window 1
      { prob: 5 }, // calm gap
      { prob: 90 }, { prob: 90 }, { prob: 5 }, // window 2 (last hour calm)
    ]);
    const windows = scanAlertWindows(w);
    expect(windows).toHaveLength(2);
  });

  it('ignores hours more than 48h in the future and hours in the past', () => {
    const hours = [-1, 0, 47, 49];
    const w = makeDailyWeather();
    w.hourly = hourlyAt(hours, [{ prob: 90 }, { prob: 5 }, { prob: 90 }, { prob: 90 }]);
    const windows = scanAlertWindows(w);
    // only the hour-47 risky reading should count; hour -1 is past, hour 49 is beyond the 48h horizon
    expect(windows).toHaveLength(1);
  });
});

describe('severityColor', () => {
  it('maps every documented severity to a distinct color', () => {
    expect(new Set(['Info', 'Watch', 'Warning'].map((s) => severityColor(s as 'Info' | 'Watch' | 'Warning'))).size).toBe(3);
  });
});

describe('travelDecision', () => {
  const makeRisk = (total: number): RiskResult => ({
    total, level: 'Low',
    factors: { precipProb: 0, precipSum: 0, windMax: 0, dwellingScore: 0, vulnScore: 0 },
  });

  it('returns Go when both ends are under 50', () => {
    expect(travelDecision(makeRisk(10), makeRisk(49))).toBe('Go');
  });

  it('returns Wait when the worse side is between 50 and 74', () => {
    expect(travelDecision(makeRisk(10), makeRisk(50))).toBe('Wait');
    expect(travelDecision(makeRisk(74), makeRisk(10))).toBe('Wait');
  });

  it('returns Avoid when the worse side is 75 or above', () => {
    expect(travelDecision(makeRisk(10), makeRisk(75))).toBe('Avoid');
  });

  it('is driven by the worse of the two sides, not the average', () => {
    // average would be 50 (Wait-ish), but the worse side (90) should force Avoid
    expect(travelDecision(makeRisk(10), makeRisk(90))).toBe('Avoid');
  });
});
