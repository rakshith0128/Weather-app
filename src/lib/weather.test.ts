import { describe, it, expect, vi, afterEach } from 'vitest';
import { wmoDesc, wmoIcon, isRainy, geocodeLocation } from './weather';

describe('wmoDesc / wmoIcon', () => {
  it('describes known WMO codes', () => {
    expect(wmoDesc(0)).toBe('Clear sky');
    expect(wmoDesc(95)).toBe('Thunderstorm');
  });

  it('falls back gracefully for an unknown code', () => {
    expect(wmoDesc(9999)).toBe('Unknown');
    expect(wmoIcon(9999)).toBe('❓');
  });
});

describe('isRainy', () => {
  it('treats drizzle, rain, and thunderstorm codes as rainy', () => {
    expect(isRainy(61)).toBe(true); // slight rain
    expect(isRainy(95)).toBe(true); // thunderstorm
    expect(isRainy(51)).toBe(true); // light drizzle
  });

  it('treats clear, cloudy, and snow codes as not rainy', () => {
    expect(isRainy(0)).toBe(false); // clear sky
    expect(isRainy(3)).toBe(false); // overcast
    expect(isRainy(71)).toBe(false); // slight snow
  });
});

describe('geocodeLocation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the raw query when it is a plain place name', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);

    await geocodeLocation('Chennai');

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('name=Chennai');
  });

  it('strips to the first segment when given a compound "City, State, Country" label (regression: Open-Meteo returns nothing for the full compound string)', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);

    await geocodeLocation('Bengaluru, Karnataka, India');

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('name=Bengaluru');
    expect(calledUrl).not.toContain('Karnataka');
  });

  it('throws when the request fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);
    await expect(geocodeLocation('Nowhere')).rejects.toThrow('Geocoding request failed');
  });
});
