import { where } from "firebase/firestore";
import {
  getDocument,
  getCollectionWithMultiFilter,
  createDocumentWithId,
  updateDocument,
  deleteDocument,
} from "~/lib/firestore.service";
import { makeCounterId } from "~/features/system/sequences/sequences.service";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import type { CounterRecord, CounterAddInput, CounterEditInput } from "./counters.types";

const COLLECTION = "counters";



type CounterDoc = Record<string, unknown>;

function toCounterRecord(id: string, data: CounterDoc): CounterRecord {
  return {
    id,
    sequenceId: String(data.sequenceId ?? ""),
    sequence: String(data.sequence ?? ""),
    period: String(data.period ?? ""),
    lastNumber: Number(data.lastNumber) || 0,
    active: data.active !== false,
  };
}

export async function getCounterById(id: string): Promise<CounterRecord | null> {
  const snap = await getDocument<CounterDoc>(COLLECTION, id);
  if (!snap) return null;
  return toCounterRecord(snap.id, snap);
}

export async function getCounters(): Promise<{ items: CounterRecord[]; last: null }> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const rows = await getCollectionWithMultiFilter<CounterDoc>(COLLECTION, [
    where("companyId", "==", companyId),
    where("accountId", "==", accountId),
  ]);
  const items = rows.map((d) => toCounterRecord(d.id, d));
  items.sort((a, b) => a.sequence.localeCompare(b.sequence) || a.period.localeCompare(b.period));
  return { items, last: null };
}

export async function getCountersBySequenceId(sequenceId: string): Promise<CounterRecord[]> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const rows = await getCollectionWithMultiFilter<CounterDoc>(COLLECTION, [
    where("sequenceId", "==", sequenceId),
    where("companyId", "==", companyId),
    where("accountId", "==", accountId),
  ]);
  return rows.map((d) => toCounterRecord(d.id, d));
}

export async function addCounter(data: CounterAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const id = makeCounterId(data.sequenceId.trim(), data.period.trim());
  await createDocumentWithId(COLLECTION, id, {
    companyId,
    accountId,
    sequenceId: data.sequenceId.trim(),
    sequence: data.sequence.trim(),
    period: data.period.trim(),
    lastNumber: Number(data.lastNumber) || 0,
    active: data.active !== false,
  });
  return id;
}

export async function updateCounter(id: string, data: CounterEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.sequenceId !== undefined) payload.sequenceId = data.sequenceId;
  if (data.sequence !== undefined) payload.sequence = data.sequence;
  if (data.period !== undefined) payload.period = data.period;
  if (data.lastNumber !== undefined) payload.lastNumber = Number(data.lastNumber) || 0;
  if (data.active !== undefined) payload.active = data.active;
  await updateDocument(COLLECTION, id, payload);
}

export async function deleteCounter(id: string): Promise<void> {
  await deleteDocument(COLLECTION, id);
}
