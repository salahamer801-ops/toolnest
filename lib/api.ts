import { NextResponse } from "next/server";
import { getGuestId, getOrCreateGuestId, getSessionUser, type PublicUser } from "./auth";
import { ensureSchema, hasDatabase } from "./db";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

export interface ApiScope {
  user: PublicUser | null;
  userId: number | null;
  guestId: string | null;
}

/**
 * Resolves who is calling: a signed-in account, or an anonymous browser id.
 * `createGuest` is only true for actions that count as usage, so simply
 * browsing the site never stores a cookie for a visitor.
 */
export async function resolveScope(options: { createGuest?: boolean } = {}): Promise<ApiScope | null> {
  if (!hasDatabase()) return null;
  await ensureSchema();
  const user = await getSessionUser();
  if (user) return { user, userId: user.id, guestId: null };
  const guestId = options.createGuest ? await getOrCreateGuestId() : await getGuestId();
  return { user: null, userId: null, guestId };
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export const cleanNumber = (value: unknown, max = 5_000_000_000): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(Math.round(parsed), max);
};
