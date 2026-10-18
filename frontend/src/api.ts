import type { RouteRequest, RouteResponse } from "./types";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function getApiUrl(): string {
  if (!API_URL) {
    throw new Error(
      "Missing EXPO_PUBLIC_API_URL. Copy .env.example to .env, set your backend URL, then restart Expo with npx expo start --tunnel.",
    );
  }
  return API_URL.replace(/\/$/, "");
}

export async function findRoutes(body: RouteRequest): Promise<RouteResponse> {
  const response = await fetch(`${getApiUrl()}/api/routes`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try {
      const parsed = JSON.parse(text) as { detail?: unknown };
      if (typeof parsed.detail === "string") {
        detail = parsed.detail;
      }
    } catch {
      // Keep the raw body when the server did not return JSON.
    }
    throw new Error(
      detail
        ? `Route request failed (${response.status}): ${detail}`
        : `Route request failed (${response.status}).`,
    );
  }

  return JSON.parse(text) as RouteResponse;
}
