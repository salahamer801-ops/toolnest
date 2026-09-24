import { hashPassword, verifyPassword, type UserRow } from "@/lib/auth";
import { json, readJson, resolveScope } from "@/lib/api";
import { one, query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PasswordBody {
  currentPassword?: string;
  newPassword?: string;
}

export async function POST(request: Request) {
  const scope = await resolveScope();
  if (!scope?.user) return json({ error: "unauthorized" }, 401);

  const body = await readJson<PasswordBody>(request);
  if (!body) return json({ error: "invalid_body" }, 400);

  const current = body.currentPassword ?? "";
  const next = body.newPassword ?? "";
  if (next.length < 8) return json({ error: "password_too_short" }, 400);

  const row = await one<UserRow>("SELECT password_hash FROM users WHERE id = $1", [scope.user.id]);
  if (!row?.password_hash || !verifyPassword(current, row.password_hash)) {
    return json({ error: "wrong_password" }, 400);
  }

  await query("UPDATE users SET password_hash = $2 WHERE id = $1", [scope.user.id, hashPassword(next)]);
  return json({ ok: true });
}
