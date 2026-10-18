import { weatherNear } from "../../api";
import { usesApi } from "../../config/features";
import { mockWeatherService } from "./mock";
import type { Weather, WeatherCondition } from "./types";

/**
 * Weather comes only from the PathWise backend. The app does not call a weather service
 * directly (no API keys on the phone, one consistent source for routing and the banner).
 */
export interface WeatherService {
  near(lat: number, lng: number, time: string): Promise<Weather>;
}

const apiWeatherService: WeatherService = {
  near: (lat, lng, time) => weatherNear(lat, lng, time),
};

export function weatherService(): WeatherService {
  return usesApi("weather") ? apiWeatherService : mockWeatherService;
}

export function weatherIsSample(): boolean {
  return !usesApi("weather");
}

const LABELS: Record<WeatherCondition, string> = {
  clear: "Clear",
  cloudy: "Cloudy",
  rain: "Rain",
  snow: "Snow",
  fog: "Fog",
  storm: "Storm",
};

export function conditionLabel(condition: WeatherCondition): string {
  return LABELS[condition];
}

/** Conditions that get the banner on the routes screen. */
export function isWetWeather(weather: Weather): boolean {
  return weather.condition === "rain" || weather.condition === "snow" || weather.condition === "storm";
}
