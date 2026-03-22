import { deleteField } from "firebase/firestore";
import {
  addDocument,
  updateDocument,
  deleteDocument,
  getCollection,
  getDocument,
  getSubcollection,
  getDocumentFromSubcollection,
  addDocumentToSubcollection,
  updateDocumentInSubcollection,
  deleteDocumentFromSubcollection,
} from "~/lib/firestore.service";
import { callHttpsFunction } from "~/lib/functions.service";
import type {
  Settlement,
  SettlementItem,
  SettlementFormValues,
  SettlementItemFormValues,
} from "./settlements.types";

export const SETTLEMENTS_COLLECTION = "settlements";
export const SETTLEMENT_ITEMS_SUBCOLLECTION = "items";

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

function normalizeCategory(raw: unknown): Settlement["category"] {
  const s = String(raw ?? "").trim();
  if (s === "customer" || s === "carrier" || s === "provider" || s === "resource") return s;
  /** Legado: conductor → recurso */
  if (s === "driver") return "resource";
  return "customer";
}

/** Etiqueta de periodo derivada (sin campo en mantenimiento). */
export function buildSettlementPeriodLabel(start: string, end: string): string {
  const a = start.trim();
  const b = end.trim();
  if (a && b) return `${a} — ${b}`;
  return a || b || "";
}

function mapSettlementDoc(id: string, data: Record<string, unknown>): Settlement {
  const entity = (data.entity as Record<string, unknown>) ?? {};
  const period = (data.period as Record<string, unknown>) ?? {};
  const totals = (data.totals as Record<string, unknown>) ?? {};

  return {
    id,
    code: String(data.code ?? ""),
    type: (data.type as Settlement["type"]) ?? "payable",
    category: normalizeCategory(data.category),
    entity: {
      type: String(entity.type ?? ""),
      id: String(entity.id ?? ""),
      name: String(entity.name ?? ""),
    },
    period: {
      start: String(period.start ?? ""),
      end: String(period.end ?? ""),
      label: String(period.label ?? ""),
    },
    totals: {
      grossAmount: num(totals.grossAmount),
      settledAmount: num(totals.settledAmount),
      pendingAmount: num(totals.pendingAmount),
      currency: String(totals.currency ?? "PEN"),
    },
    status: (data.status as Settlement["status"]) ?? "draft",
    paymentStatus: (data.paymentStatus as Settlement["paymentStatus"]) ?? "pending",
  };
}

function mapItemDoc(id: string, data: Record<string, unknown>): SettlementItem {
  const movement = (data.movement as Record<string, unknown>) ?? {};
  const trip = (data.trip as Record<string, unknown>) ?? {};
  return {
    id,
    movement: {
      type: String(movement.type ?? ""),
      id: String(movement.id ?? ""),
    },
    trip: {
      id: String(trip.id ?? ""),
      code: String(trip.code ?? ""),
    },
    concept: String(data.concept ?? ""),
    amount: num(data.amount),
    settledAmount: num(data.settledAmount),
    pendingAmount: num(data.pendingAmount),
    currency: String(data.currency ?? "PEN"),
  };
}

export async function getSettlements(): Promise<Settlement[]> {
  const rows = await getCollection(SETTLEMENTS_COLLECTION);
  return rows.map((r) => mapSettlementDoc(r.id, r as Record<string, unknown>));
}

export async function getSettlementById(id: string): Promise<Settlement | null> {
  const doc = await getDocument(SETTLEMENTS_COLLECTION, id);
  if (!doc) return null;
  return mapSettlementDoc(doc.id, doc as Record<string, unknown>);
}

export function settlementToFormValues(s: Settlement): SettlementFormValues {
  return {
    code: s.code,
    type: s.type,
    category: s.category,
    entityType: s.entity.type,
    entityId: s.entity.id,
    entityName: s.entity.name,
    periodStart: s.period.start,
    periodEnd: s.period.end,
    currency: s.totals.currency,
    status: s.status,
    paymentStatus: s.paymentStatus,
  };
}

export function formValuesToSettlementPayload(
  v: SettlementFormValues,
  existing: Settlement | null
): Omit<Settlement, "id"> {
  const periodLabel = buildSettlementPeriodLabel(v.periodStart, v.periodEnd);

  const totalsBase = existing?.totals ?? {
    grossAmount: 0,
    settledAmount: 0,
    pendingAmount: 0,
    currency: v.currency,
  };

  return {
    code: v.code.trim(),
    type: v.type,
    category: v.category,
    entity: {
      type: v.entityType.trim(),
      id: v.entityId.trim(),
      name: v.entityName.trim(),
    },
    period: {
      start: v.periodStart,
      end: v.periodEnd,
      label: periodLabel,
    },
    totals: {
      grossAmount: totalsBase.grossAmount,
      settledAmount: totalsBase.settledAmount,
      pendingAmount: totalsBase.pendingAmount,
      currency: v.currency,
    },
    status: v.status,
    paymentStatus: v.paymentStatus,
  };
}

export async function createSettlement(v: SettlementFormValues): Promise<string> {
  const payload = formValuesToSettlementPayload(v, null);
  return addDocument(SETTLEMENTS_COLLECTION, payload);
}

export async function updateSettlement(id: string, v: SettlementFormValues): Promise<void> {
  const existing = await getSettlementById(id);
  const payload = formValuesToSettlementPayload(v, existing);
  await updateDocument(SETTLEMENTS_COLLECTION, id, {
    ...(payload as Record<string, unknown>),
    /** Quitar legado `metadata` (ya existe createAt / auditoría en raíz). */
    metadata: deleteField(),
  });
}

/** Respuesta de la Cloud Function `syncSettlementItems`. */
export interface SyncSettlementItemsResult {
  ok: boolean;
  itemCount: number;
  grossAmount: number;
  currency: string;
}

/**
 * Recalcula ítems y totales en servidor (viajes en el periodo → cargos o costos).
 * Solo aplica a categorías `customer` y `resource`.
 */
export async function syncSettlementItemsFromTrips(
  settlementId: string
): Promise<SyncSettlementItemsResult> {
  return callHttpsFunction<{ settlementId: string }, SyncSettlementItemsResult>(
    "syncSettlementItems",
    { settlementId },
    { errorFallback: "No se pudieron sincronizar los ítems de la liquidación." }
  );
}

export async function deleteSettlement(id: string): Promise<void> {
  const items = await getSubcollection(
    SETTLEMENTS_COLLECTION,
    id,
    SETTLEMENT_ITEMS_SUBCOLLECTION
  );
  for (const row of items) {
    await deleteDocumentFromSubcollection(
      SETTLEMENTS_COLLECTION,
      id,
      SETTLEMENT_ITEMS_SUBCOLLECTION,
      row.id
    );
  }
  await deleteDocument(SETTLEMENTS_COLLECTION, id);
}

export async function deleteSettlements(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteSettlement(id)));
}

export async function getSettlementItems(settlementId: string): Promise<SettlementItem[]> {
  const rows = await getSubcollection(
    SETTLEMENTS_COLLECTION,
    settlementId,
    SETTLEMENT_ITEMS_SUBCOLLECTION
  );
  return rows.map((r) => mapItemDoc(r.id, r as Record<string, unknown>));
}

export async function getSettlementItemById(
  settlementId: string,
  itemId: string
): Promise<SettlementItem | null> {
  const doc = await getDocumentFromSubcollection(
    SETTLEMENTS_COLLECTION,
    settlementId,
    SETTLEMENT_ITEMS_SUBCOLLECTION,
    itemId
  );
  if (!doc) return null;
  return mapItemDoc(doc.id, doc as Record<string, unknown>);
}

export function itemToFormValues(i: SettlementItem): SettlementItemFormValues {
  return {
    movementType: i.movement.type,
    movementId: i.movement.id,
    tripId: i.trip.id,
    tripCode: i.trip.code,
    concept: i.concept,
    amount: i.amount,
    settledAmount: i.settledAmount,
    pendingAmount: i.pendingAmount,
    currency: i.currency,
  };
}

export function formValuesToItemPayload(v: SettlementItemFormValues): Omit<SettlementItem, "id"> {
  return {
    movement: { type: v.movementType.trim(), id: v.movementId.trim() },
    trip: { id: v.tripId.trim(), code: v.tripCode.trim() },
    concept: v.concept.trim(),
    amount: v.amount,
    settledAmount: v.settledAmount,
    pendingAmount: v.pendingAmount,
    currency: v.currency,
  };
}

export async function createSettlementItem(
  settlementId: string,
  v: SettlementItemFormValues
): Promise<string> {
  return addDocumentToSubcollection(
    SETTLEMENTS_COLLECTION,
    settlementId,
    SETTLEMENT_ITEMS_SUBCOLLECTION,
    formValuesToItemPayload(v)
  );
}

export async function updateSettlementItem(
  settlementId: string,
  itemId: string,
  v: SettlementItemFormValues
): Promise<void> {
  await updateDocumentInSubcollection(
    SETTLEMENTS_COLLECTION,
    settlementId,
    SETTLEMENT_ITEMS_SUBCOLLECTION,
    itemId,
    formValuesToItemPayload(v) as Record<string, unknown>
  );
}

export async function deleteSettlementItem(settlementId: string, itemId: string): Promise<void> {
  await deleteDocumentFromSubcollection(
    SETTLEMENTS_COLLECTION,
    settlementId,
    SETTLEMENT_ITEMS_SUBCOLLECTION,
    itemId
  );
}

export async function deleteSettlementItems(settlementId: string, ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteSettlementItem(settlementId, id)));
}
