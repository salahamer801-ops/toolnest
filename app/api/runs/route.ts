import { cleanNumber, json, readJson, resolveScope } from "@/lib/api";
import { query } from "@/lib/db";
import { plans, planForUser } from "@/lib/plans";
import { toolSlugs } from "@/lib/tools";
import { countToday, usageSummary } from "@/lib/usage";

export const dynamic = "force-dynamic";

interface RunBody {
  toolSlug?: string;
  inputSize?: number;
  outputSize?: number;
  durationMs?: number;
  status?: string;
}

export async function POST(request: Request) {
  const scope = await resolveScope({ createGuest: true });
  if (!scope) return json({ ok: false, database: false }, 200);

  const body = await readJson<RunBody>(request);
  if (!body?.toolSlug || !toolSlugs.includes(body.toolSlug)) {
    return json({ ok: false, error: "unknown_tool" }, 400);
  }

  const plan = planForUser(scope.user);
  const limit = plans[plan].dailyLimit;
  const used = await countToday(scope);

  if (used >= limit) {
    return json({ ok: false, limited: true, plan, limit, used, remaining: 0 }, 429);
  }

  await query(
    `INSERT INTO tool_runs (user_id, guest_id, tool_slug, input_size, output_size, duration_ms, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      scope.userId,
      scope.guestId,
      body.toolSlug,
      cleanNumber(body.inputSize),
      cleanNumber(body.outputSize),
      cleanNumber(body.durationMs, 3_600_000),
      body.status === "error" ? "error" : "ok",
    ],
  );

  const usage = await usageSummary(scope, scope.user);
  return json({ ok: true, limited: false, plan, limit, used: usage.usedToday, remaining: usage.remaining });
}
