import { getDocument } from "~/lib/firestore.service";
import type { UsageMonthRecord } from "./usage-months.types";

const COLLECTION = "usage-months";

export function currentUsagePeriod(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function usageMonthDocId(accountId: string, period: string): string {
  return `${accountId.trim()}_${period.trim()}`;
}

/**
 * Agregado del período actual (`{accountId}_{yyyy-mm}`) si existe.
 */
export async function getUsageMonthForAccount(
  accountId: string,
  period = currentUsagePeriod()
): Promise<UsageMonthRecord | null> {
  const aid = accountId.trim();
  if (!aid) return null;
  const id = usageMonthDocId(aid, period);
  const snap = await getDocument<Record<string, unknown>>(COLLECTION, id);
  if (!snap) return null;
  const raw: Record<string, unknown> = { ...snap };
  delete raw.id;
  return {
    id: snap.id,
    accountId: String(snap.accountId ?? aid),
    period: String(snap.period ?? period),
    raw,
  };
}
