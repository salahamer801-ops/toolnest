import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { ensureSchema, one, query } from "./db";

export const SESSION_COOKIE = "tn_session";
export const GUEST_COOKIE = "tn_guest";
const SESSION_DAYS = 30;

export interface UserRow {
  id: string;
  email: string;
  name: string;
  locale: string;
  role: string;
  created_at: Date;
  password_hash?: string;
}

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  locale: string;
  role: string;
  createdAt: string;
}

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export const toPublicUser = (row: UserRow): PublicUser => ({
  id: Number(row.id),
  email: row.email,
  name: row.name,
  locale: row.locale,
  role: row.role,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
});

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const secureCookie = process.env.NODE_ENV === "production";

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [
    userId,
    sha256(token),
    expiresAt,
  ]);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    expires: expiresAt,
  });
  return { token, expiresAt };
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await query("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
  }
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSessionUser(): Promise<PublicUser | null> {
  if (!process.env.DATABASE_URL) return null;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await ensureSchema();
  const row = await one<UserRow>(
    `SELECT u.id, u.email, u.name, u.locale, u.role, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  );
  return row ? toPublicUser(row) : null;
}

/** Reads the anonymous browser id without creating one. */
export async function getGuestId(): Promise<string | null> {
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value ?? null;
}

/** Anonymous identifier so guest usage can be counted without an account. */
export async function getOrCreateGuestId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(GUEST_COOKIE)?.value;
  if (existing) return existing;
  const created = randomBytes(16).toString("base64url");
  store.set(GUEST_COOKIE, created, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
  return created;
}
