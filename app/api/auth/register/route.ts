import { createSession, hashPassword, normalizeEmail, toPublicUser, type UserRow } from "@/lib/auth";
import { isEmail, json, jsonReadError, readJson } from "@/lib/api";
import { ensureSchema, one, query } from "@/lib/db";
import { clientKey, enforceRateLimit, RATE_LIMITS, resetRateLimit } from "@/lib/ratelimit";
import { usageSummary } from "@/lib/usage";

export const dynamic = "force-dynamic";

interface RegisterBody {
  name?: string;
  email?: string;
  password?: string;
  locale?: string;
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(RATE_LIMITS.register, request);
  if (limited) return limited;

  // The tables must exist before the first query on users.
  await ensureSchema();

  const body = await readJson<RegisterBody>(request);
  if (!body.ok) return jsonReadError(body.error);

  const name = (body.data.name ?? "").trim();
  const email = normalizeEmail(body.data.email ?? "");
  const password = body.data.password ?? "";
  const locale = body.data.locale === "ar" ? "ar" : "en";

  if (name.length < 2) return json({ error: "name_too_short" }, 400);
  if (!isEmail(email)) return json({ error: "invalid_email" }, 400);
  if (password.length < 8) return json({ error: "password_too_short" }, 400);

  const existing = await one<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
  if (existing) return json({ error: "email_taken" }, 409);

  const inserted = await query<UserRow>(
    `INSERT INTO users (email, name, password_hash, locale)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, locale, role, created_at`,
    [email, name, hashPassword(password), locale],
  );

  await resetRateLimit(RATE_LIMITS.register, clientKey(request));

  const user = toPublicUser(inserted[0]);
  await createSession(user.id);

  const usage = await usageSummary({ userId: user.id, guestId: null }, user);

  return json({ user, usage }, 201);
}
