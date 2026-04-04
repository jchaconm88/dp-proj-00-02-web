export type UsageMonthRecord = {
  id: string;
  accountId: string;
  period: string;
  /** Contadores u otros campos agregados (según plan SaaS / triggers). */
  raw: Record<string, unknown>;
};
