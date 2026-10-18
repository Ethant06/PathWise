import type {
  DataStatusResponse,
  GoogleLoginRequest,
  HealthResponse,
  LoginRequest,
  PlaceHit,
  RegisterRequest,
  RouteRequest,
  RouteResponse,
  TokenResponse,
  UserPublic,
} from "./types";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function getApiUrl(): string {
  if (!API_URL) {
    throw new Error(
      "Missing EXPO_PUBLIC_API_URL. Copy .env.example to .env, set the URL, and restart Expo.",
    );
  }
  return API_URL.replace(/\/$/, "");
}

async function request<T>(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (init?.token) {
    headers.set("Authorization", `Bearer ${init.token}`);
  }
  headers.set("ngrok-skip-browser-warning", "true");

  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
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
      detail ? `Request failed (${response.status}): ${detail}` : `Request failed (${response.status}).`,
    );
  }
  return JSON.parse(text) as T;
}

export function register(body: RegisterRequest): Promise<TokenResponse> {
  return request("/api/auth/register", { method: "POST", body: JSON.stringify(body) });
}

export function login(body: LoginRequest): Promise<TokenResponse> {
  return request("/api/auth/login", { method: "POST", body: JSON.stringify(body) });
}

export function loginWithGoogle(body: GoogleLoginRequest): Promise<TokenResponse> {
  return request("/api/auth/google", { method: "POST", body: JSON.stringify(body) });
}

export function currentUser(token: string): Promise<UserPublic> {
  return request("/api/auth/me", { token });
}

export function health(): Promise<HealthResponse> {
  return request("/api/health");
}

export function dataStatus(): Promise<DataStatusResponse> {
  return request("/api/data-status");
}

export function searchPlaces(query: string): Promise<PlaceHit[]> {
  const q = encodeURIComponent(query);
  return request(`/api/places?q=${q}`);
}

export function findRoutes(body: RouteRequest): Promise<RouteResponse> {
  return request("/api/routes", { method: "POST", body: JSON.stringify(body) });
}
