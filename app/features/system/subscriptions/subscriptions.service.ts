import { getDocument } from "~/lib/firestore.service";
import { parseStatus, SUBSCRIPTION_STATUS } from "~/constants/status-options";
import type { SubscriptionRecord } from "./subscriptions.types";

const COLLECTION = "subscriptions";

type SubscriptionDoc = {
  accountId?: string;
  planId?: string;
  status?: string;
};

function toRecord(id: string, d: SubscriptionDoc): SubscriptionRecord {
  const status = parseStatus(d.status, SUBSCRIPTION_STATUS, "active") as SubscriptionRecord["status"];
  return {
    id,
    accountId: d.accountId ?? id,
    planId: d.planId ?? "default",
    status,
  };
}

/** Suscripción por account (doc id = accountId tras seed de migración). */
export async function getSubscriptionByAccountId(accountId: string): Promise<SubscriptionRecord | null> {
  const aid = accountId.trim();
  if (!aid) return null;
  const snap = await getDocument<SubscriptionDoc>(COLLECTION, aid);
  if (!snap) return null;
  return toRecord(snap.id, snap);
}
