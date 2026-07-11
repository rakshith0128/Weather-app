export type Dwelling = 'flat' | 'ground' | 'independent';

export type Language =
  | 'English' | 'Hindi' | 'Kannada' | 'Tamil'
  | 'Telugu' | 'Marathi' | 'Bengali' | 'Malayalam';

export interface Profile {
  locationName: string;
  lat: number;
  lon: number;
  adults: number;
  children: number;
  elderly: number;
  pets: number;
  dwelling: Dwelling;
  language: Language;
}

export interface GeocodeResult {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface WeatherData {
  timezone: string;
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    uv_index_max: number[];
  };
}

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Severe';

export interface RiskResult {
  total: number;
  level: RiskLevel;
  factors: {
    precipProb: number;
    precipSum: number;
    windMax: number;
    dwellingScore: number;
    vulnScore: number;
  };
}

export type AlertSeverity = 'Info' | 'Watch' | 'Warning';

export interface AlertWindow {
  startTime: string;
  endTime: string;
  maxProb: number;
  maxWind: number;
  totalPrecip: number;
  severity: AlertSeverity;
}

export type TravelDecisionType = 'Go' | 'Wait' | 'Avoid';

export interface PlanData {
  do_now: string[];
  do_today: string[];
  do_this_week: string[];
}
