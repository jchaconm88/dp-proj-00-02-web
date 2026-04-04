import type { SubscriptionStatusKey } from "~/constants/status-options";

export type SubscriptionRecord = {
  id: string;
  accountId: string;
  planId: string;
  status: SubscriptionStatusKey;
};
