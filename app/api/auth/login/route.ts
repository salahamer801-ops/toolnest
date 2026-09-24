import { createSession, normalizeEmail, toPublicUser, verifyPassword, type UserRow } from "@/lib/auth";
import { isEmail, json, jsonReadError, readJson } from "@/lib/api";
import { ensureSchema, one } from "@/lib/db";
import { clientKey, enforceRateLimit, RATE_LIMITS, resetRateLimit } from "@/lib/ratelimit";
import { usageSummary } from "@/lib/usage";

export const dynamic = "force-dynamic";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(RATE_LIMITS.login, request);
  if (limited) return limited;

  await ensureSchema();

  const body = await readJson<LoginBody>(request);
  if (!body.ok) return jsonReadError(body.error);

  const email = normalizeEmail(body.data.email ?? "");
  const password = body.data.password ?? "";
  if (!isEmail(email) || !password) return json({ error: "invalid_credentials" }, 400);

  const row = await one<UserRow>(
    `SELECT id, email, name, locale, role, created_at, password_hash FROM users WHERE email = $1`,
    [email],
  );

  if (!row?.password_hash || !verifyPassword(password, row.password_hash)) {
    return json({ error: "invalid_credentials" }, 401);
  }

  await resetRateLimit(RATE_LIMITS.login, clientKey(request));

  const user = toPublicUser(row);
  await createSession(user.id);
  const usage = await usageSummary({ userId: user.id, guestId: null }, user);

  return json({ user, usage });
}
