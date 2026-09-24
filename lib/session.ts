"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  locale: string;
  role: string;
  createdAt: string;
}

export interface SessionUsage {
  plan: "guest" | "free" | "pro" | "business";
  dailyLimit: number;
  usedToday: number;
  remaining: number;
  totalRuns: number;
  runsLast30: number;
  bytesSaved: number;
  byTool: { toolSlug: string; runs: number; savedBytes: number }[];
}

export interface SessionState {
  user: SessionUser | null;
  usage: SessionUsage | null;
  database: boolean;
  loading: boolean;
}

const initialState: SessionState = { user: null, usage: null, database: true, loading: true };

let state: SessionState = initialState;
const listeners = new Set<() => void>();
let loaded = false;

const emit = () => {
  for (const listener of listeners) listener();
};

const setState = (next: Partial<SessionState>) => {
  state = { ...state, ...next };
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;
const getServerSnapshot = () => initialState;

export async function refreshSession(): Promise<SessionState> {
  try {
    const response = await fetch("/api/auth/me/", { cache: "no-store" });
    const data = (await response.json()) as {
      user: SessionUser | null;
      usage: SessionUsage | null;
      database?: boolean;
    };
    setState({
      user: data.user ?? null,
      usage: data.usage ?? null,
      database: data.database !== false,
      loading: false,
    });
  } catch {
    setState({ user: null, usage: null, loading: false });
  }
  loaded = true;
  return state;
}

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  void refreshSession();
}

/** Shared session state — the header and the account page read the same snapshot. */
export function useSession(): SessionState {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    ensureLoaded();
  }, []);
  return snapshot;
}

export interface RunResult {
  ok: boolean;
  limited: boolean;
  remaining: number | null;
  plan?: SessionUsage["plan"];
  limit?: number;
}

/**
 * Records a finished tool run for the daily allowance and the history page.
 * A limit stop is reported back so the tool can explain it to the visitor.
 */
export async function logRun(payload: {
  toolSlug: string;
  inputSize?: number;
  outputSize?: number;
  durationMs?: number;
  status?: "ok" | "error";
}): Promise<RunResult> {
  try {
    const response = await fetch("/api/runs/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      // Survives a navigation that happens right after the tool finishes.
      keepalive: true,
    });
    const data = (await response.json()) as {
      ok?: boolean;
      limited?: boolean;
      used?: number;
      remaining?: number;
      plan?: SessionUsage["plan"];
      limit?: number;
      database?: boolean;
    };
    if (data.database === false) return { ok: false, limited: false, remaining: null };
    if (data.ok) {
      setState({
        usage: state.usage
          ? {
              ...state.usage,
              usedToday: typeof data.used === "number" ? data.used : state.usage.usedToday + 1,
              remaining: data.remaining ?? Math.max(0, state.usage.remaining - 1),
            }
          : state.usage,
      });
    }
    return {
      ok: Boolean(data.ok),
      limited: Boolean(data.limited),
      remaining: typeof data.remaining === "number" ? data.remaining : null,
      plan: data.plan,
      limit: data.limit,
    };
  } catch {
    return { ok: false, limited: false, remaining: null };
  }
}

export async function signOut() {
  await fetch("/api/auth/logout/", { method: "POST" });
  loaded = true;
  await refreshSession();
}

export interface RunPayload {
  inputSize?: number;
  outputSize?: number;
  durationMs?: number;
  status?: "ok" | "error";
}

/**
 * Records tool runs for the history page and the daily allowance.
 * `track` returns false when the daily allowance is used up, so a tool can
 * explain the stop instead of pretending the work succeeded.
 */
export function useRunTracker(toolSlug: string) {
  const [limit, setLimit] = useState<number | null>(null);
  const once = useRef(false);

  const track = useCallback(
    async (payload: RunPayload = {}) => {
      const result = await logRun({ toolSlug, ...payload });
      if (result.limited) setLimit(result.limit ?? 0);
      return result;
    },
    [toolSlug],
  );

  /** For instant tools: counts the first use per page view only. */
  const trackOnce = useCallback(
    async (payload: RunPayload = {}) => {
      if (once.current) return null;
      once.current = true;
      return track(payload);
    },
    [track],
  );

  return { track, trackOnce, limitReached: limit };
}
