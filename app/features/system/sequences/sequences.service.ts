import { getDocument, getCollection, getFirst, addDocument, updateDocument, deleteDocument } from "~/lib/firestore.service";
import { callHttpsFunction } from "~/lib/functions.service";
import type {
  ResetPeriod,
  SequenceRecord,
  SequenceAddInput,
  SequenceEditInput,
  GenerateSequenceCodeRequest,
  GenerateSequenceCodeResponse,
} from "./sequences.types";

const COLLECTION = "sequences";

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

// ——— Contadores (solo ID compuesto; la numeración correlativa vive en Cloud Functions) ———

export function makeCounterId(sequenceId: string, period: string): string {
  const safe = String(period ?? "").replace(/\//g, "-").trim() || "all";
  return `${sequenceId}_${safe}`;
}

/**
 * Código a guardar: misma regla que en servidor (`generateSequenceCode` callable).
 * Requiere sesión; la generación correlativa y la transacción en `counters` ocurren en Cloud Functions.
 */
export async function generateSequenceCode(currentCode: string, entity: string): Promise<string> {
  const entityTrim = String(entity ?? "").trim();
  if (!entityTrim) {
    throw new Error("La entidad de secuencia es obligatoria.");
  }
  const res = await callHttpsFunction<GenerateSequenceCodeRequest, GenerateSequenceCodeResponse>(
    "generateSequenceCode",
    { currentCode: String(currentCode ?? ""), entity: entityTrim },
    { errorFallback: "Error al resolver el código." }
  );
  if (typeof res.code !== "string" || !res.code.trim()) {
    throw new Error("No se recibió un código válido del servidor.");
  }
  return res.code.trim();
}
