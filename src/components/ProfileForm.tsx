'use client';

import { useState } from 'react';
import { geocodeLocation } from '@/lib/weather';
import type { Dwelling, GeocodeResult, Language, Profile } from '@/lib/types';

const LANGUAGES: Language[] = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Marathi', 'Bengali', 'Malayalam'];

interface Props {
  initial?: Profile | null;
  submitLabel: string;
  onSave: (profile: Profile) => void;
}

export default function ProfileForm({ initial, submitLabel, onSave }: Props) {
  const [locQuery, setLocQuery] = useState(initial?.locationName ?? '');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ name: string; lat: number; lon: number } | null>(
    initial?.lat != null ? { name: initial.locationName, lat: initial.lat, lon: initial.lon } : null
  );
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  const [adults, setAdults] = useState(initial?.adults ?? 1);
  const [children, setChildren] = useState(initial?.children ?? 0);
  const [elderly, setElderly] = useState(initial?.elderly ?? 0);
  const [pets, setPets] = useState(initial?.pets ?? 0);
  const [dwelling, setDwelling] = useState<Dwelling>(initial?.dwelling ?? 'flat');
  const [language, setLanguage] = useState<Language>(initial?.language ?? 'English');
  const [formError, setFormError] = useState<string | null>(null);

  const doSearch = async () => {
    const q = locQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const r = await geocodeLocation(q);
      if (r.length === 0) setSearchError('No matches found. Try a different spelling.');
      setResults(r);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const useGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocation not supported in this browser.');
      return;
    }
    setGeoStatus('Locating…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSelected({ name: 'Current location', lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocQuery('Current location');
        setGeoStatus(null);
        setResults([]);
      },
      (err) => setGeoStatus(`Could not get location: ${err.message}`)
    );
  };

  const handleSave = () => {
    if (!selected) {
      setFormError('Please select a location first.');
      return;
    }
    setFormError(null);
    onSave({
      locationName: selected.name,
      lat: selected.lat,
      lon: selected.lon,
      adults, children, elderly, pets,
      dwelling, language,
    });
  };

  return (
    <div className="space-y-5">
      {/* Location */}
      <div>
        <label className="text-xs uppercase tracking-wide text-dim font-semibold">Location</label>
        <div className="flex gap-2 mt-1.5">
          <input
            type="text"
            placeholder="Search your city or area..."
            value={locQuery}
            onChange={(e) => setLocQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }}
            className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={doSearch}
            className="bg-surface2 border border-border rounded-lg px-4 py-2.5 text-sm hover:border-accent font-medium"
          >
            Search
          </button>
          <button
            type="button"
            onClick={useGeolocation}
            title="Use my current location"
            className="bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm hover:border-accent"
          >
            📍
          </button>
        </div>

        {searching && (
          <p className="text-xs text-dim mt-2 flex items-center gap-2">
            <span className="spin inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full" /> Searching…
          </p>
        )}
        {searchError && <p className="text-xs text-danger mt-2">{searchError}</p>}
        {geoStatus && <p className="text-xs text-dim mt-2">{geoStatus}</p>}

        {results.length > 0 && (
          <div className="mt-2 space-y-1">
            {results.map((r, i) => {
              const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelected({ name: label, lat: r.latitude, lon: r.longitude });
                    setLocQuery(label);
                    setResults([]);
                  }}
                  className="block w-full text-left text-sm bg-surface2 hover:border-accent border border-border rounded-lg px-3 py-2.5 transition-colors"
                >
                  {label} <span className="text-dim text-xs">({r.latitude.toFixed(2)}, {r.longitude.toFixed(2)})</span>
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="mt-2 text-sm text-accent flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Selected: {selected.name} ({selected.lat.toFixed(3)}, {selected.lon.toFixed(3)})
          </div>
        )}
      </div>

      {/* Household */}
      <div>
        <label className="text-xs uppercase tracking-wide text-dim font-semibold mb-1.5 block">Household members</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ['adults', adults, setAdults],
            ['children', children, setChildren],
            ['elderly', elderly, setElderly],
            ['pets', pets, setPets],
          ] as const).map(([key, val, setter]) => (
            <div key={key}>
              <label className="text-xs text-dim capitalize">{key}</label>
              <input
                type="number" min={0} max={20}
                value={val}
                onChange={(e) => setter(Math.max(0, +e.target.value || 0))}
                className="w-full mt-1 bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dwelling */}
      <div>
        <label className="text-xs uppercase tracking-wide text-dim font-semibold">Dwelling type</label>
        <select
          value={dwelling}
          onChange={(e) => setDwelling(e.target.value as Dwelling)}
          className="w-full mt-1.5 bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
        >
          <option value="flat">Upper-floor flat/apartment</option>
          <option value="ground">Ground floor unit</option>
          <option value="independent">Independent house</option>
        </select>
      </div>

      {/* Language */}
      <div>
        <label className="text-xs uppercase tracking-wide text-dim font-semibold">Preferred language</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="w-full mt-1.5 bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
        >
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <button
        type="button"
        onClick={handleSave}
        className="w-full bg-accent text-bg font-semibold rounded-xl py-3 text-sm hover:opacity-90 transition-opacity"
      >
        {submitLabel}
      </button>
    </div>
  );
}
