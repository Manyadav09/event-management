"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PollState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  live: boolean;
};

/**
 * Lightweight live-data hook: polls a JSON endpoint so every dashboard
 * updates itself without a manual reload.
 */
export function usePoll<T>(
  url: string,
  { interval = 5000, enabled = true }: { interval?: number; enabled?: boolean } = {},
): PollState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [live, setLive] = useState(true);
  const mounted = useRef(true);
  const first = useRef(true);

  const refresh = useCallback(async () => {
    if (first.current) {
      first.current = false;
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const res = await fetch(url, { cache: "no-store" });
      const payload = await res.json();
      if (!mounted.current) return;
      if (!res.ok || payload?.ok === false) {
        setError(payload?.error ?? "Could not load live data");
        setLive(false);
      } else {
        setData(payload as T);
        setError(null);
        setLive(true);
        setLastUpdated(new Date());
      }
    } catch {
      if (mounted.current) {
        setError("Network hiccup — retrying…");
        setLive(false);
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [url]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    if (!enabled) return () => { mounted.current = false; };
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void refresh();
    }, interval);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, [refresh, enabled, interval]);

  return { data, error, loading, refreshing, lastUpdated, refresh, live };
}

/** Ticking clock for countdowns. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
