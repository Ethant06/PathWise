import { mockCall } from "../shared/mock";
import type { WeatherService } from "./service";
import type { Weather } from "./types";

/**
 * Sample weather that changes by day of the month (rain, cloudy, clear), so both the banner and
 * the quiet state show up while testing. It is labeled as sample data wherever it appears.
 */
export const mockWeatherService: WeatherService = {
  near: (_lat, _lng, time) =>
    mockCall((): Weather => {
      const day = new Date(time).getDate() % 3;
      const base = { source: "Sample data (not live)", fetched_at: new Date().toISOString() };
      if (day === 0) return { ...base, condition: "rain", precipitation_mm_h: 0.8, temperature_c: 11 };
      if (day === 1) return { ...base, condition: "cloudy", precipitation_mm_h: 0, temperature_c: 13 };
      return { ...base, condition: "clear", precipitation_mm_h: 0, temperature_c: 15 };
    }),
};
