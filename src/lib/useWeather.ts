'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchWeather } from './weather';
import type { WeatherData } from './types';

const CACHE_MS = 10 * 60 * 1000;

/**
 * Fetches real weather for a given lat/lon and caches it in memory for
 * 10 minutes so switching tabs doesn't re-hit Open-Meteo every time.
 * Call refresh(true) to force a live refetch (e.g. a "Refresh" button).
 */
export function useWeather(lat: number | undefined, lon: number | undefined) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (force = false) => {
      if (lat == null || lon == null) return;
      if (!force && weather && fetchedAt && Date.now() - fetchedAt < CACHE_MS) return;
      setLoading(true);
      setError(null);
      try {
        const w = await fetchWeather(lat, lon);
        setWeather(w);
        setFetchedAt(Date.now());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load weather data.');
      } finally {
        setLoading(false);
      }
    },
    [lat, lon, weather, fetchedAt]
  );

  useEffect(() => {
    refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);

  return { weather, fetchedAt, loading, error, refresh };
}
