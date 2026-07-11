import type { GeocodeResult, WeatherData } from './types';

/**
 * Real data: Open-Meteo Geocoding API (no key required).
 * The API expects a plain place name, not a "City, State, Country" label
 * (it returns admin1/country as separate fields for disambiguation, not
 * as query input) — so if a compound label is passed in (e.g. reusing a
 * previously-selected location's display name), only the first segment
 * before the comma is sent as the actual search term.
 */
export async function geocodeLocation(query: string): Promise<GeocodeResult[]> {
  const placeName = query.split(',')[0].trim();
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(placeName)}&count=6&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();
  return data.results ?? [];
}

/** Real data: Open-Meteo Forecast API (no key required) */
export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,relative_humidity_2m',
    hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max',
    timezone: 'auto',
    forecast_days: '7',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) throw new Error('Weather request failed');
  return res.json();
}

/**
 * WMO weather code lookup — the official standard used by Open-Meteo.
 * This is a reference table (like a units-of-measure lookup), not
 * fabricated weather data.
 */
const WMO: Record<number, [string, string]> = {
  0: ['Clear sky', '☀️'], 1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'], 48: ['Rime fog', '🌫️'],
  51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Dense drizzle', '🌧️'],
  56: ['Freezing drizzle', '🌧️'], 57: ['Freezing drizzle', '🌧️'],
  61: ['Slight rain', '🌧️'], 63: ['Moderate rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
  66: ['Freezing rain', '🌧️'], 67: ['Heavy freezing rain', '🌧️'],
  71: ['Slight snow', '🌨️'], 73: ['Moderate snow', '🌨️'], 75: ['Heavy snow', '🌨️'], 77: ['Snow grains', '🌨️'],
  80: ['Rain showers', '🌦️'], 81: ['Rain showers', '🌧️'], 82: ['Violent showers', '⛈️'],
  85: ['Snow showers', '🌨️'], 86: ['Heavy snow showers', '🌨️'],
  95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm, hail', '⛈️'], 99: ['Severe thunderstorm, hail', '⛈️'],
};

export function wmoDesc(code: number): string {
  return (WMO[code] ?? ['Unknown', ''])[0];
}
export function wmoIcon(code: number): string {
  return (WMO[code] ?? ['', '❓'])[1];
}

const RAINY_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
export function isRainy(code: number): boolean {
  return RAINY_CODES.has(code);
}
