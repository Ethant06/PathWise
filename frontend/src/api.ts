import type { AvoidZone, NewAvoidZone } from "./features/avoidZones/types";
import type { WalkFeedback } from "./features/feedback/types";
import type { LightingLayer } from "./features/lighting/types";
import type { NewReport, Report, ReportPhoto, ReportReceipt } from "./features/reports/types";
import type { SavedPlace, SavedPlaceInput, SavedPlacePatch } from "./features/savedPlaces/types";
import type { NewWalk, Walk, WalkPage } from "./features/walks/types";
import type { Weather } from "./features/weather/types";
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
  // FormData (photo upload) sets its own multipart boundary.
  if (init?.body && !(init.body instanceof FormData)) {
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
      } else if (Array.isArray(parsed.detail)) {
        detail = parsed.detail
          .map((item) =>
            item && typeof item === "object" && "msg" in item ? String(item.msg) : String(item),
          )
          .join(" ");
      }
    } catch {
      // Keep the raw body when the server did not return JSON.
    }
    throw new Error(
      detail ? `Request failed (${response.status}): ${detail}` : `Request failed (${response.status}).`,
    );
  }
  // DELETE answers 204 with no body.
  return (text ? JSON.parse(text) : undefined) as T;
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

export type WatchMessage = {
  kind: "off_route" | "still" | "arrived";
  text: string;
  sent_at: string;
  delivered?: boolean;
};

export type WatchSession = {
  id: string;
  watcher_name: string;
  notice: string | null;
  messages: WatchMessage[];
};

export type Watcher = {
  name: string;
  handle: string;
  phone: string;
};

export type WatcherList = {
  line: string;
  watchers: Watcher[];
};

export function listWatchers(fresh = false): Promise<WatcherList> {
  return request(fresh ? "/api/watch/watchers?fresh=true" : "/api/watch/watchers");
}

export function startWatch(body: {
  walker_name: string;
  watcher_handle: string;
  destination_name: string;
}): Promise<WatchSession> {
  return request("/api/watch", { method: "POST", body: JSON.stringify(body) });
}

export function updateWatch(
  id: string,
  body: {
    off_route: boolean;
    arrived?: boolean;
    rerouted?: boolean;
    street?: string | null;
    lat?: number;
    lng?: number;
  },
): Promise<WatchSession> {
  return request(`/api/watch/${id}`, { method: "POST", body: JSON.stringify(body) });
}

// Proposed endpoints: not implemented by the backend yet
//
// Each function has a section in frontend/BACKEND_CONTRACTS.md. The app calls them only when
// src/config/features.ts sets that feature's source to "api"; until then it uses the mock in
// src/features/<feature>/mock.ts.

function query(params: Record<string, string | number | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

// TODO(backend): GET /api/me/places (BACKEND_CONTRACTS.md#saved-places)
export function listSavedPlaces(token: string): Promise<SavedPlace[]> {
  return request("/api/me/places", { token });
}

// TODO(backend): POST /api/me/places (BACKEND_CONTRACTS.md#saved-places)
export function createSavedPlace(token: string, body: SavedPlaceInput): Promise<SavedPlace> {
  return request("/api/me/places", { method: "POST", body: JSON.stringify(body), token });
}

// TODO(backend): PATCH /api/me/places/{id} (BACKEND_CONTRACTS.md#saved-places)
export function updateSavedPlace(token: string, id: string, body: SavedPlacePatch): Promise<SavedPlace> {
  return request(`/api/me/places/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body), token });
}

// TODO(backend): DELETE /api/me/places/{id} (BACKEND_CONTRACTS.md#saved-places)
export function deleteSavedPlace(token: string, id: string): Promise<void> {
  return request(`/api/me/places/${encodeURIComponent(id)}`, { method: "DELETE", token });
}

// TODO(backend): POST /api/me/walks (BACKEND_CONTRACTS.md#walks)
export function createWalk(token: string, body: NewWalk): Promise<Walk> {
  return request("/api/me/walks", { method: "POST", body: JSON.stringify(body), token });
}

// TODO(backend): GET /api/me/walks?cursor= (BACKEND_CONTRACTS.md#walks)
export function listWalks(token: string, cursor?: string): Promise<WalkPage> {
  return request(`/api/me/walks${query({ cursor })}`, { token });
}

// TODO(backend): DELETE /api/me/walks/{id} (BACKEND_CONTRACTS.md#walks)
export function deleteWalk(token: string, id: string): Promise<void> {
  return request(`/api/me/walks/${encodeURIComponent(id)}`, { method: "DELETE", token });
}

// TODO(backend): DELETE /api/me/walks (BACKEND_CONTRACTS.md#walks)
export function deleteAllWalks(token: string): Promise<void> {
  return request("/api/me/walks", { method: "DELETE", token });
}

// TODO(backend): POST /api/walks/{id}/feedback (BACKEND_CONTRACTS.md#walk-feedback)
export function sendWalkFeedback(token: string, walkId: string, body: WalkFeedback): Promise<WalkFeedback> {
  return request(`/api/walks/${encodeURIComponent(walkId)}/feedback`, {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

// TODO(backend): POST /api/reports (BACKEND_CONTRACTS.md#reports)
export function createReport(token: string, body: NewReport, photo?: ReportPhoto | null): Promise<ReportReceipt> {
  if (!photo) {
    return request("/api/reports", { method: "POST", body: JSON.stringify(body), token });
  }
  const form = new FormData();
  form.append("category", body.category);
  form.append("lat", String(body.lat));
  form.append("lng", String(body.lng));
  if (body.note) form.append("note", body.note);
  // React Native's FormData accepts a { uri, name, type } file part.
  form.append("photo", {
    uri: photo.uri,
    name: "report.jpg",
    type: photo.mime_type ?? "image/jpeg",
  } as unknown as Blob);
  return request("/api/reports", { method: "POST", body: form, token });
}

// TODO(backend): GET /api/reports?bbox=w,s,e,n&since=ISO (BACKEND_CONTRACTS.md#reports)
export function listReports(bbox: [number, number, number, number], since: string): Promise<Report[]> {
  return request(`/api/reports${query({ bbox: bbox.join(","), since })}`);
}

// TODO(backend): GET /api/me/avoid-zones (BACKEND_CONTRACTS.md#avoid-zones)
export function listAvoidZones(token: string): Promise<AvoidZone[]> {
  return request("/api/me/avoid-zones", { token });
}

// TODO(backend): POST /api/me/avoid-zones (BACKEND_CONTRACTS.md#avoid-zones)
export function createAvoidZone(token: string, body: NewAvoidZone): Promise<AvoidZone> {
  return request("/api/me/avoid-zones", { method: "POST", body: JSON.stringify(body), token });
}

// TODO(backend): DELETE /api/me/avoid-zones/{id} (BACKEND_CONTRACTS.md#avoid-zones)
export function deleteAvoidZone(token: string, id: string): Promise<void> {
  return request(`/api/me/avoid-zones/${encodeURIComponent(id)}`, { method: "DELETE", token });
}

// TODO(backend): GET /api/layers/lighting?bbox=w,s,e,n&time=ISO (BACKEND_CONTRACTS.md#lighting-layer)
export function lightingLayer(bbox: [number, number, number, number], time: string): Promise<LightingLayer> {
  return request(`/api/layers/lighting${query({ bbox: bbox.join(","), time })}`);
}

// TODO(backend): GET /api/weather?lat=&lng=&time= (BACKEND_CONTRACTS.md#weather)
export function weatherNear(lat: number, lng: number, time: string): Promise<Weather> {
  return request(`/api/weather${query({ lat, lng, time })}`);
}
