import { useEffect, useSyncExternalStore } from "react";

import { readJson, writeJson } from "../../storage/local";

/** Voice guidance is off until the walker turns it on in Profile. Stored on this phone. */
const KEY = "voice.v1";

let enabled = false;
let loaded = false;
const listeners = new Set<() => void>();

function publish(next: boolean) {
  enabled = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function voiceEnabled(): boolean {
  return enabled;
}

export function useVoiceEnabled(): boolean {
  const value = useSyncExternalStore(subscribe, voiceEnabled);
  useEffect(() => {
    if (loaded) return;
    loaded = true;
    readJson<{ enabled: boolean }>(KEY, { enabled: false })
      .then((stored) => publish(Boolean(stored.enabled)))
      .catch(() => {});
  }, []);
  return value;
}

export async function setVoiceEnabled(next: boolean): Promise<void> {
  publish(next);
  await writeJson(KEY, { enabled: next });
}
