import { one, query } from "./db";
import { plans, planForUser, type PlanId } from "./plans";
import type { PublicUser } from "./auth";

export interface UsageScope {
  userId: number | null;
  guestId: string | null;
}

export interface UsageSummary {
  plan: PlanId;
  dailyLimit: number;
  usedToday: number;
  remaining: number;
  totalRuns: number;
  runsLast30: number;
  bytesSaved: number;
  byTool: { toolSlug: string; runs: number; savedBytes: number }[];
}

const scopeClause = (scope: UsageScope) =>
  scope.userId ? { where: "user_id = $1", params: [scope.userId] as unknown[] } : { where: "guest_id = $1", params: [scope.guestId ?? ""] as unknown[] };

export async function usageSummary(scope: UsageScope, user: PublicUser | null): Promise<UsageSummary> {
  const plan = planForUser(user);
  const { where, params } = scopeClause(scope);

  const [today, totals, byTool] = await Promise.all([
    one<{ count: string }>(
      `SELECT count(*)::text AS count FROM tool_runs WHERE ${where} AND created_at >= date_trunc('day', now())`,
      params,
    ),
    one<{ total: string; last30: string; saved: string }>(
      `SELECT count(*)::text AS total,
              count(*) FILTER (WHERE created_at >= now() - interval '30 days')::text AS last30,
              COALESCE(SUM(GREATEST(input_size - output_size, 0)), 0)::text AS saved
         FROM tool_runs WHERE ${where}`,
      params,
    ),
    query<{ tool_slug: string; runs: string; saved: string }>(
      `SELECT tool_slug,
              count(*)::text AS runs,
              COALESCE(SUM(GREATEST(input_size - output_size, 0)), 0)::text AS saved
         FROM tool_runs
        WHERE ${where} AND created_at >= now() - interval '30 days'
        GROUP BY tool_slug
        ORDER BY count(*) DESC
        LIMIT 12`,
      params,
    ),
  ]);

  const usedToday = Number(today?.count ?? 0);
  const dailyLimit = plans[plan].dailyLimit;

  return {
    plan,
    dailyLimit,
    usedToday,
    remaining: Math.max(0, dailyLimit - usedToday),
    totalRuns: Number(totals?.total ?? 0),
    runsLast30: Number(totals?.last30 ?? 0),
    bytesSaved: Number(totals?.saved ?? 0),
    byTool: byTool.map((row) => ({
      toolSlug: row.tool_slug,
      runs: Number(row.runs),
      savedBytes: Number(row.saved),
    })),
  };
}

export interface RunRow {
  id: string;
  tool_slug: string;
  input_size: string;
  output_size: string;
  duration_ms: number;
  status: string;
  created_at: Date;
}

export async function recentRuns(scope: UsageScope, limit = 50) {
  const { where, params } = scopeClause(scope);
  const rows = await query<RunRow>(
    `SELECT id, tool_slug, input_size, output_size, duration_ms, status, created_at
       FROM tool_runs
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT $2`,
    [...params, Math.min(Math.max(limit, 1), 200)],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    toolSlug: row.tool_slug,
    inputSize: Number(row.input_size),
    outputSize: Number(row.output_size),
    durationMs: Number(row.duration_ms),
    status: row.status,
    createdAt: (row.created_at instanceof Date ? row.created_at : new Date(row.created_at)).toISOString(),
  }));
}

export async function countToday(scope: UsageScope) {
  const { where, params } = scopeClause(scope);
  const row = await one<{ count: string }>(
    `SELECT count(*)::text AS count FROM tool_runs WHERE ${where} AND created_at >= date_trunc('day', now())`,
    params,
  );
  return Number(row?.count ?? 0);
}
