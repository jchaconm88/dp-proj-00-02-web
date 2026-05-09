import { webFetch } from "~/lib/backend-client";
import { parseStatus, SUBSCRIPTION_STATUS } from "~/constants/status-options";
import type { SubscriptionRecord } from "./subscriptions.types";

function toRecord(id: string, d: Record<string, unknown>): SubscriptionRecord {
  const status = parseStatus(d.status, SUBSCRIPTION_STATUS, "active") as SubscriptionRecord["status"];
  return {
    id,
    accountId: String(d.accountId ?? id),
    planId: String(d.planId ?? "default"),
    status,
  };
}

export async function getSubscriptionByAccountId(accountId: string): Promise<SubscriptionRecord | null> {
  const aid = accountId.trim();
  if (!aid) return null;
  const raw = await webFetch<Record<string, unknown> | null>(
    `/system/subscriptions/${encodeURIComponent(aid)}`
  );
  if (!raw) return null;
  return toRecord(String(raw.id ?? aid), raw);
}