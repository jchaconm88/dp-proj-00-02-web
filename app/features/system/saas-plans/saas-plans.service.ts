import { webFetch } from "~/lib/backend-client";
import type { SaasPlanRecord } from "./saas-plans.types";

const BASE = "/platform/saas-plans";

export async function getSaasPlanById(id: string): Promise<SaasPlanRecord | null> {
  try {
    const row = await webFetch<Record<string, unknown>>(`${BASE}/${encodeURIComponent(id)}`);
    if (!row) return null;
    const d = row;
    return {
      id: String(d.id ?? ""),
      name: String(d.name ?? d.id ?? ""),
      active: d.active !== false,
      planId: String(d.planId ?? d.id ?? ""),
      limits: d.limits && typeof d.limits === "object" ? d.limits as Record<string, unknown> : undefined,
      features: d.features && typeof d.features === "object" ? d.features as Record<string, unknown> : undefined,
    };
  } catch {
    return null;
  }
}

export async function updateSaasPlanLimits(planId: string, limits: Record<string, number>): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries(limits)
      .map(([key, value]) => [String(key).trim(), Number(value)])
      .filter(([key, value]) => key && Number.isFinite(value))
  );
  await webFetch(`${BASE}/${encodeURIComponent(planId)}/limits`, {
    method: "PUT",
    body: JSON.stringify({ limits: clean }),
  });
}
