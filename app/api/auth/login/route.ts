import { createSession, normalizeEmail, toPublicUser, verifyPassword, type UserRow } from "@/lib/auth";
import { isEmail, json, readJson } from "@/lib/api";
import { ensureSchema, one } from "@/lib/db";
import { usageSummary } from "@/lib/usage";

export const dynamic = "force-dynamic";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  const body = await readJson<LoginBody>(request);
  if (!body) return json({ error: "invalid_body" }, 400);

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  if (!isEmail(email) || !password) return json({ error: "invalid_credentials" }, 400);

  await ensureSchema();
  const row = await one<UserRow>(
    `SELECT id, email, name, locale, role, created_at, password_hash FROM users WHERE email = $1`,
    [email],
  );

  if (!row?.password_hash || !verifyPassword(password, row.password_hash)) {
    return json({ error: "invalid_credentials" }, 401);
  }

  const user = toPublicUser(row);
  await createSession(user.id);
  const usage = await usageSummary({ userId: user.id, guestId: null }, user);

  return json({ user, usage });
}
