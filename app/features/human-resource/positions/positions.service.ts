import { getDocument, getCollection, addDocument, updateDocument, deleteDocument, deleteManyDocuments } from "~/lib/firestore.service";
import type { PositionRecord, PositionAddInput, PositionEditInput } from "./positions.types";

const COLLECTION = "positions";

function toPositionRecord(id: string, data: Record<string, unknown>): PositionRecord {
  return {
    id,
    code: String(data.code ?? ""),
    name: String(data.name ?? ""),
    active: data.active !== false,
  };
}

export async function getPosition(id: string): Promise<PositionRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toPositionRecord(d.id, d) : null;
}

export async function getPositions(): Promise<{ items: PositionRecord[] }> {
  const list = await getCollection<Record<string, unknown>>(COLLECTION, 500);
  const items = list.map((d) => toPositionRecord(d.id, d));
  items.sort((a, b) => a.name.localeCompare(b.name));
  return { items };
}

export async function addPosition(data: PositionAddInput): Promise<string> {
  return addDocument(COLLECTION, {
    code: data.code.trim(),
    name: data.name.trim(),
    active: data.active !== false,
  });
}

export async function updatePosition(id: string, data: PositionEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.active !== undefined) payload.active = data.active;
  await updateDocument(COLLECTION, id, payload);
}

export async function deletePosition(id: string): Promise<void> {
  await deleteDocument(COLLECTION, id);
}

export async function deletePositions(ids: string[]): Promise<void> {
  await deleteManyDocuments(COLLECTION, ids);
}
