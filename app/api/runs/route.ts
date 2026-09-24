import { cleanNumber, json, jsonReadError, readJson, resolveScope } from "@/lib/api";
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

/** Hard caps for client-reported statistics (bytes / milliseconds). */
const MAX_BYTES = 1_073_741_824;
const MAX_DURATION_MS = 3_600_000;

export async function POST(request: Request) {
  const scope = await resolveScope({ createGuest: true });
  if (!scope) return json({ ok: false, database: false }, 200);

  const body = await readJson<RunBody>(request);
  if (!body.ok) return jsonReadError(body.error);

  const toolSlug = body.data.toolSlug;
  if (!toolSlug || !toolSlugs.includes(toolSlug)) {
    return json({ ok: false, error: "unknown_tool" }, 400);
  }

  const plan = planForUser(scope.user);
  const limit = plans[plan].dailyLimit;
  const used = await countToday(scope);

  if (used >= limit) {
    return json({ ok: false, limited: true, plan, limit, used, remaining: 0 }, 429);
  }

  // Sizes and durations are self-reported by the browser: they are validated and
  // clamped for statistics and history, and must never be used as billing truth.
  // Anything charged for later has to be measured on the server.
  const inputSize = cleanNumber(body.data.inputSize, MAX_BYTES);
  const outputSize = cleanNumber(body.data.outputSize, MAX_BYTES);
  const durationMs = cleanNumber(body.data.durationMs, MAX_DURATION_MS);
  const status = body.data.status === "error" ? "error" : "ok";

  await query(
    `INSERT INTO tool_runs (user_id, guest_id, tool_slug, input_size, output_size, duration_ms, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [scope.userId, scope.guestId, toolSlug, inputSize, outputSize, durationMs, status],
  );

  const usage = await usageSummary(scope, scope.user);
  return json({ ok: true, limited: false, plan, limit, used: usage.usedToday, remaining: usage.remaining });
}
