"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

const LOCAL_EVENT = "local-storage-change"

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(LOCAL_EVENT, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(LOCAL_EVENT, callback)
  }
}

/**
 * JSON state persisted in localStorage and kept in sync across components and tabs.
 * Returns `fallback` during SSR and when storage is unavailable.
 */
export function useLocalStorage<T>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => value is T,
): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => undefined as unknown as string | null,
  )
  const hydrated = raw !== undefined

  const value = useMemo<T>(() => {
    if (raw == null) return fallback
    try {
      const parsed: unknown = JSON.parse(raw)
      return validate && !validate(parsed) ? fallback : (parsed as T)
    } catch {
      return fallback
    }
    // fallback/validate are expected to be stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw])

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      let prev = fallback
      const current = read(key)
      if (current != null) {
        try {
          prev = JSON.parse(current) as T
        } catch {}
      }
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved))
      } catch {}
      window.dispatchEvent(new Event(LOCAL_EVENT))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  return [value, setValue, hydrated]
}
