import {
  getCollection,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
} from "~/lib/firestore.service";
import type {
  PlanRecord,
  PlanAddInput,
  PlanEditInput,
  PlanStatus,
} from "./plans.types";

const COLLECTION = "plans";

function toPlanStatus(v: unknown): PlanStatus {
  const s = String(v ?? "").toLowerCase();
  if (
    s === "confirmed" ||
    s === "in_progress" ||
    s === "completed" ||
    s === "cancelled"
  )
    return s;
  return "draft";
}

function toOrderIds(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  return [];
}

function toPlanRecord(doc: { id: string } & Record<string, unknown>): PlanRecord {
  return {
    id: doc.id,
    code: String(doc.code ?? ""),
    date: String(doc.date ?? ""),
    zone: String(doc.zone ?? ""),
    vehicleType: String(doc.vehicleType ?? ""),
    orderIds: toOrderIds(doc.orderIds),
    status: toPlanStatus(doc.status),
  };
}

export async function getPlans(): Promise<{ items: PlanRecord[] }> {
  const list = await getCollection<Record<string, unknown>>(COLLECTION);
  return { items: list.map(toPlanRecord) };
}

export async function getPlanById(id: string): Promise<PlanRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toPlanRecord(d) : null;
}

export async function addPlan(data: PlanAddInput): Promise<string> {
  return addDocument(COLLECTION, {
    code: data.code.trim(),
    date: data.date.trim(),
    zone: data.zone.trim(),
    vehicleType: data.vehicleType.trim(),
    orderIds: Array.isArray(data.orderIds) ? data.orderIds : [],
    status: data.status,
  });
}

export async function updatePlan(id: string, data: PlanEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.date !== undefined) payload.date = data.date.trim();
  if (data.zone !== undefined) payload.zone = data.zone.trim();
  if (data.vehicleType !== undefined) payload.vehicleType = data.vehicleType.trim();
  if (data.orderIds !== undefined) payload.orderIds = data.orderIds;
  if (data.status !== undefined) payload.status = data.status;
  await updateDocument(COLLECTION, id, payload);
}

export async function deletePlan(id: string): Promise<void> {
  return deleteDocument(COLLECTION, id);
}

export async function deletePlans(ids: string[]): Promise<void> {
  return deleteManyDocuments(COLLECTION, ids);
}
