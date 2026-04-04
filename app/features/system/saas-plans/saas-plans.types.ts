export type SaasPlanRecord = {
  id: string;
  name: string;
  active: boolean;
  planId: string;
  limits?: Record<string, unknown>;
  features?: Record<string, unknown>;
};
