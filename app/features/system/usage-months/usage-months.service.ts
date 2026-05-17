import { webFetch } from "~/lib/backend-client";
import type { UsageMonthRecord } from "./usage-months.types";

const BASE = "/platform/usage-months";

export function currentUsagePeriod(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function getUsageMonthForAccount(
  accountId: string,
  period = currentUsagePeriod()
): Promise<UsageMonthRecord | null> {
  const aid = accountId.trim();
  if (!aid) return null;
  try {
    const query = period ? `?period=${encodeURIComponent(period)}` : "";
    const row = await webFetch<Record<string, unknown>>(`${BASE}/${encodeURIComponent(aid)}${query}`);
    if (!row) return null;
    return {
      id: String(row.id ?? ""),
      accountId: String(row.accountId ?? aid),
      period: String(row.period ?? period),
      raw: row as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}
