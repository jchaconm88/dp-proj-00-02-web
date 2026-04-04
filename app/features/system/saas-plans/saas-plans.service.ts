import { getDocument } from "~/lib/firestore.service";
import type { SaasPlanRecord } from "./saas-plans.types";

/** Catálogo SaaS (límites / features); colección raíz `plans`. */
const COLLECTION = "plans";

type PlanDoc = {
  name?: string;
  active?: boolean;
  limits?: Record<string, unknown>;
  features?: Record<string, unknown>;
};

export async function getSaasPlanById(id: string): Promise<SaasPlanRecord | null> {
  const snap = await getDocument<PlanDoc>(COLLECTION, id);
  if (!snap) return null;
  const d = snap;
  return {
    id: snap.id,
    name: d.name ?? snap.id,
    active: d.active !== false,
    planId: snap.id,
    limits: d.limits && typeof d.limits === "object" ? d.limits : undefined,
    features: d.features && typeof d.features === "object" ? d.features : undefined,
  };
}
