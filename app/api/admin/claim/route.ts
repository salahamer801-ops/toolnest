import { adminCount, adminGuard, claimFirstAdmin } from "@/lib/admin";
import { json, resolveScope } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Tells the page whether the one-time claim is still available. */
export async function GET() {
  const scope = await resolveScope();
  if (!scope?.user) return json({ canClaim: false, admins: await adminCount() });
  const guard = adminGuard(scope);
  return json({
    canClaim: "error" in guard && (await adminCount()) === 0,
    admins: await adminCount(),
    role: scope.user.role,
  });
}

export async function POST() {
  const scope = await resolveScope();
  if (!scope?.user) return json({ error: "unauthorized" }, 401);

  const claimed = await claimFirstAdmin(scope.user);
  if (!claimed) return json({ error: "admin_exists" }, 409);
  return json({ ok: true, role: "super_admin" });
}
