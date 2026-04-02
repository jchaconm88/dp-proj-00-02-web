import {
  getDocument,
  getCollection,
  addDocument,
  updateDocument,
  deleteDocument,
  getCollectionWithFilter,
  getCollectionWithMultiFilter,
} from "~/lib/firestore.service";
import { where } from "firebase/firestore";
import { parseStatus, RESET_PERIOD } from "~/constants/status-options";
import { callHttpsFunction } from "~/lib/functions.service";
import { requireActiveCompanyId } from "~/lib/tenant";
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
  const resetPeriod = parseStatus(data.resetPeriod, RESET_PERIOD) as ResetPeriod;
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
  const companyId = requireActiveCompanyId();
  const rows = await getCollectionWithFilter<SequenceDoc>(COLLECTION, "companyId", companyId);
  const items = rows.map((d) => toSequenceRecord(d.id, d));
  items.sort((a, b) => a.entity.localeCompare(b.entity));
  return { items, last: null };
}

export async function getActiveSequenceByEntity(entity: string): Promise<SequenceRecord | null> {
  const companyId = requireActiveCompanyId();
  const rows = await getCollectionWithMultiFilter<SequenceDoc>(COLLECTION, [
    where("companyId", "==", companyId),
    where("entity", "==", entity),
  ]);
  const snap = rows[0];
  return snap && snap.active !== false ? toSequenceRecord(snap.id, snap) : null;
}

export async function addSequence(data: SequenceAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  return addDocument(COLLECTION, {
    companyId,
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
  const companyId = requireActiveCompanyId();
  const res = await callHttpsFunction<GenerateSequenceCodeRequest, GenerateSequenceCodeResponse>(
    "generateSequenceCode",
    { currentCode: String(currentCode ?? ""), entity: entityTrim, companyId },
    { errorFallback: "Error al resolver el código." }
  );
  if (typeof res.code !== "string" || !res.code.trim()) {
    throw new Error("No se recibió un código válido del servidor.");
  }
  return res.code.trim();
}
