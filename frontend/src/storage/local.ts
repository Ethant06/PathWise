import Storage from "expo-sqlite/kv-store";

/**
 * Device storage for feature data (saved places, walks, reports, zones, settings).
 * Backed by expo-sqlite's key-value store, which runs in Expo Go. The login token stays in
 * expo-secure-store (src/session.ts); do not move secrets here.
 */
const PREFIX = "pathwise.";

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await Storage.getItem(PREFIX + key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // A value written by an older build that no longer parses: start fresh.
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  await Storage.setItem(PREFIX + key, JSON.stringify(value));
}

export async function removeKey(key: string): Promise<void> {
  await Storage.removeItem(PREFIX + key);
}
