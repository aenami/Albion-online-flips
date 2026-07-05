"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * A boolean backed by localStorage, safe for SSR (falls back to
 * `defaultValue` on the server and during the first client render before
 * hydration reads the real stored value).
 */
export function usePersistentBoolean(
  key: string,
  defaultValue: boolean
): [boolean, (next: boolean) => void] {
  const getSnapshot = () => {
    const stored = window.localStorage.getItem(key);
    return stored === null ? defaultValue : stored === "true";
  };
  const getServerSnapshot = () => defaultValue;

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: boolean) => {
      window.localStorage.setItem(key, String(next));
      // The native "storage" event only fires in *other* tabs; dispatch one
      // manually so this tab's subscribers see the update immediately.
      window.dispatchEvent(new Event("storage"));
    },
    [key]
  );

  return [value, setValue];
}
