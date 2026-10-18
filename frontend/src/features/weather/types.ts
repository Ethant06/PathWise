/** Proposed: not in the API yet. See frontend/BACKEND_CONTRACTS.md#weather. */

export type WeatherCondition = "clear" | "cloudy" | "rain" | "snow" | "fog" | "storm";

export type Weather = {
  condition: WeatherCondition;
  precipitation_mm_h: number;
  temperature_c: number;
  source: string;
  fetched_at: string;
};
