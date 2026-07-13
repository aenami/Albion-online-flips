"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * A JSON-serializable value backed by localStorage, safe for SSR (falls back
 * to `defaultValue` on the server and during the first client render, so
 * useSyncExternalStore reconciles without a hydration mismatch).
 *
 * A per-instance cache keyed by the raw stored string keeps `getSnapshot`
 * referentially stable — returning a fresh object every call would loop.
 */
export function usePersistentJson<T>(
  key: string,
  defaultValue: T
): [T, (next: T) => void] {
  const cache = useRef<{ raw: string | null; value: T }>({
    raw: null,
    value: defaultValue,
  });

  const getSnapshot = () => {
    const raw = window.localStorage.getItem(key);
    if (cache.current.raw !== raw) {
      let value = defaultValue;
      if (raw !== null) {
        try {
          value = JSON.parse(raw) as T;
        } catch {
          value = defaultValue; // corrupt entry: fall back rather than throw
        }
      }
      cache.current = { raw, value };
    }
    return cache.current.value;
  };
  const getServerSnapshot = () => defaultValue;

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: T) => {
      window.localStorage.setItem(key, JSON.stringify(next));
      // The native "storage" event only fires in *other* tabs; dispatch one
      // manually so this tab's subscribers see the update immediately.
      window.dispatchEvent(new Event("storage"));
    },
    [key]
  );

  return [value, setValue];
}
