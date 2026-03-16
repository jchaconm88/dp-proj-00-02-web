import { getDocument, getCollection, getFirst, addDocument, updateDocument, deleteDocument, runTransaction, getDocRef } from "~/lib/firestore.service";
import type { ResetPeriod, SequenceRecord, SequenceAddInput, SequenceEditInput } from "./sequences.types";

const COLLECTION = "sequences";
const COUNTERS_COLLECTION = "counters";



type SequenceDoc = Record<string, unknown>;

function toSequenceRecord(id: string, data: SequenceDoc): SequenceRecord {
  const rp = data.resetPeriod as string;
  const resetPeriod: ResetPeriod =
    rp === "yearly" || rp === "monthly" || rp === "daily" ? rp : "never";
  return {
    id,
    entity: String(data.entity ?? ""),
    prefix: String(data.prefix ?? ""),
    digits: Number(data.digits) || 6,
    format: String(data.format ?? "{prefix}-{number}"),
    resetPeriod,
    allowManualOverride: data.allowManualOverride === true,
    preventGaps: data.preventGaps === true,
    active: data.active !== false,
  };
}

export async function getSequenceById(id: string): Promise<SequenceRecord | null> {
  const snap = await getDocument<SequenceDoc>(COLLECTION, id);
  if (!snap) return null;
  return toSequenceRecord(snap.id, snap);
}

export async function getSequences(): Promise<{ items: SequenceRecord[]; last: null }> {
  const rows = await getCollection<SequenceDoc>(COLLECTION, 200);
  const items = rows.map((d) => toSequenceRecord(d.id, d));
  items.sort((a, b) => a.entity.localeCompare(b.entity));
  return { items, last: null };
}

export async function getActiveSequenceByEntity(entity: string): Promise<SequenceRecord | null> {
  const snap = await getFirst<SequenceDoc>(COLLECTION, "entity", entity);
  return snap && snap.active !== false ? toSequenceRecord(snap.id, snap) : null;
}

export async function addSequence(data: SequenceAddInput): Promise<string> {
  return addDocument(COLLECTION, {
    entity: data.entity.trim(),
    prefix: (data.prefix ?? "").trim(),
    digits: Number(data.digits) || 6,
    format: (data.format ?? "{prefix}-{number}").trim(),
    resetPeriod: data.resetPeriod ?? "yearly",
    allowManualOverride: !!data.allowManualOverride,
    preventGaps: !!data.preventGaps,
    active: data.active !== false,
  });
}

export async function updateSequence(id: string, data: SequenceEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.entity !== undefined) payload.entity = data.entity.trim();
  if (data.prefix !== undefined) payload.prefix = data.prefix.trim();
  if (data.digits !== undefined) payload.digits = Number(data.digits) || 6;
  if (data.format !== undefined) payload.format = data.format.trim();
  if (data.resetPeriod !== undefined) payload.resetPeriod = data.resetPeriod;
  if (data.allowManualOverride !== undefined) payload.allowManualOverride = data.allowManualOverride;
  if (data.preventGaps !== undefined) payload.preventGaps = data.preventGaps;
  if (data.active !== undefined) payload.active = data.active;
  await updateDocument(COLLECTION, id, payload);
}

export async function deleteSequence(id: string): Promise<void> {
  await deleteDocument(COLLECTION, id);
}

// â”€â”€ Utilidades de numeración â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function makeCounterId(sequenceId: string, period: string): string {
  const safe = String(period ?? "").replace(/\//g, "-").trim() || "all";
  return `${sequenceId}_${safe}`;
}

export function getCurrentPeriod(resetPeriod: ResetPeriod): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  switch (resetPeriod) {
    case "yearly":  return String(y);
    case "monthly": return `${y}-${m}`;
    case "daily":   return `${y}-${m}-${d}`;
    default:        return "all";
  }
}

/**
 * Genera el siguiente número para la entidad según la secuencia configurada.
 * Usa una transacción para evitar condiciones de carrera por concurrencia.
 */
export async function generateNumber(entity: string): Promise<string> {
  const sequence = await getActiveSequenceByEntity(entity);
  if (!sequence) {
    throw new Error(`No existe una secuencia activa para la entidad "${entity}".`);
  }

  const period = getCurrentPeriod(sequence.resetPeriod);
  const counterId = makeCounterId(sequence.id, period);

  const nextNumber = await runTransaction(async (transaction, firestoreDb) => {
    const ref = getDocRef(COUNTERS_COLLECTION, counterId);
    const snap = await transaction.get(ref);
    let next: number;
    if (!snap.exists()) {
      next = 1;
      transaction.set(ref, {
        sequenceId: sequence.id,
        sequence: `${sequence.entity} (${sequence.prefix})`.trim(),
        period,
        lastNumber: 1,
        active: true,
      });
    } else {
      const last = Number(snap.data()?.lastNumber ?? 0) || 0;
      next = last + 1;
      transaction.update(ref, { lastNumber: next });
    }
    return next;
  });

  const year  = String(new Date().getFullYear());
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const day   = String(new Date().getDate()).padStart(2, "0");
  const digits = Math.max(0, Number(sequence.digits) || 6);
  const numberStr = String(nextNumber).padStart(digits, "0");

  return String(sequence.format ?? "{prefix}-{number}")
    .replace(/\{prefix\}/gi, sequence.prefix ?? "")
    .replace(/\{year\}/gi,   year)
    .replace(/\{month\}/gi,  month)
    .replace(/\{day\}/gi,    day)
    .replace(/\{number\}/gi, numberStr);
}

/**
 * Devuelve el código a guardar: si currentCode tiene valor lo devuelve;
 * si está vacío genera el siguiente con generateNumber(entity).
 */
export async function resolveCodeIfEmpty(currentCode: string, entity: string): Promise<string> {
  const trimmed = String(currentCode ?? "").trim();
  if (trimmed) return trimmed;
  return generateNumber(entity);
}
