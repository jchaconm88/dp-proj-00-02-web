import {
  getDocument,
  getCollection,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
  getSubcollection,
  getDocumentFromSubcollection,
  addDocumentToSubcollection,
  updateDocumentInSubcollection,
  deleteDocumentFromSubcollection,
} from "~/lib/firestore.service";
import type {
  ResourceRecord,
  ResourceAddInput,
  ResourceEditInput,
  ResourceEngagementType,
  ResourceStatus,
  ResourceCostRecord,
  ResourceCostAddInput,
  ResourceCostEditInput,
  ResourceCostType,
} from "./resources.types";

const COLLECTION = "resources";
const RESOURCE_COSTS_SUB = "resourceCosts";

function toResourceRecord(doc: { id: string } & Record<string, unknown>): ResourceRecord {
  const e = (doc.engagementType as string) || "sporadic";
  const engagementType: ResourceEngagementType =
    e === "permanent" || e === "contract" ? e : "sporadic";
  const s = (doc.status as string) || "active";
  const status: ResourceStatus =
    s === "inactive" || s === "suspended" ? s : "active";
  return {
    id: doc.id,
    code: String(doc.code ?? ""),
    firstName: String(doc.firstName ?? ""),
    lastName: String(doc.lastName ?? ""),
    documentNo: String(doc.documentNo ?? ""),
    documentTypeId: String(doc.documentTypeId ?? ""),
    documentType: String(doc.documentType ?? ""),
    phone: String(doc.phone ?? doc.phoneNo ?? ""),
    email: String(doc.email ?? ""),
    positionId: String(doc.positionId ?? ""),
    position: String(doc.position ?? ""),
    hireDate: String(doc.hireDate ?? ""),
    engagementType,
    status,
  };
}

function toResourceCostRecord(doc: { id: string } & Record<string, unknown>): ResourceCostRecord {
  const t = (doc.type as string) || "per_trip";
  const type: ResourceCostType =
    t === "per_hour" || t === "per_day" || t === "fixed" ? t : "per_trip";
  return {
    id: doc.id,
    code: String(doc.code ?? ""),
    name: String(doc.name ?? ""),
    type,
    amount: Number(doc.amount) ?? 0,
    currency: String(doc.currency ?? "PEN"),
    effectiveFrom: String(doc.effectiveFrom ?? ""),
    active: doc.active !== false,
  };
}

// --- Resources ---

export async function getResource(id: string): Promise<ResourceRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toResourceRecord(d) : null;
}

export async function getResources(): Promise<{ items: ResourceRecord[] }> {
  const list = await getCollection<Record<string, unknown>>(COLLECTION);
  return { items: list.map((d) => toResourceRecord(d)) };
}

export async function addResource(data: ResourceAddInput): Promise<string> {
  return addDocument(COLLECTION, {
    code: data.code.trim(),
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    documentNo: data.documentNo.trim(),
    documentTypeId: data.documentTypeId.trim(),
    documentType: data.documentType.trim(),
    phone: data.phone.trim(),
    email: data.email.trim(),
    positionId: data.positionId.trim(),
    position: data.position.trim(),
    hireDate: data.hireDate.trim() || null,
    engagementType: data.engagementType,
    status: data.status,
  });
}

export async function updateResource(id: string, data: ResourceEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code;
  if (data.firstName !== undefined) payload.firstName = data.firstName;
  if (data.lastName !== undefined) payload.lastName = data.lastName;
  if (data.documentNo !== undefined) payload.documentNo = data.documentNo;
  if (data.documentTypeId !== undefined) payload.documentTypeId = data.documentTypeId;
  if (data.documentType !== undefined) payload.documentType = data.documentType;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.email !== undefined) payload.email = data.email;
  if (data.positionId !== undefined) payload.positionId = data.positionId;
  if (data.position !== undefined) payload.position = data.position;
  if (data.hireDate !== undefined) payload.hireDate = data.hireDate || null;
  if (data.engagementType !== undefined) payload.engagementType = data.engagementType;
  if (data.status !== undefined) payload.status = data.status;
  await updateDocument(COLLECTION, id, payload);
}

export async function deleteResource(id: string): Promise<void> {
  return deleteDocument(COLLECTION, id);
}

export async function deleteResources(ids: string[]): Promise<void> {
  return deleteManyDocuments(COLLECTION, ids);
}

// --- Resource costs (subcollection) ---

export async function getResourceCosts(resourceId: string): Promise<{ items: ResourceCostRecord[] }> {
  const list = await getSubcollection<Record<string, unknown>>(
    COLLECTION,
    resourceId,
    RESOURCE_COSTS_SUB
  );
  return { items: list.map((d) => toResourceCostRecord(d)) };
}

export async function getResourceCost(
  resourceId: string,
  costId: string
): Promise<ResourceCostRecord | null> {
  const d = await getDocumentFromSubcollection<Record<string, unknown>>(
    COLLECTION,
    resourceId,
    RESOURCE_COSTS_SUB,
    costId
  );
  return d ? toResourceCostRecord(d) : null;
}

export async function addResourceCost(
  resourceId: string,
  data: ResourceCostAddInput
): Promise<string> {
  return addDocumentToSubcollection(
    COLLECTION,
    resourceId,
    RESOURCE_COSTS_SUB,
    {
      code: data.code.trim(),
      name: data.name.trim(),
      type: data.type,
      amount: Number(data.amount) ?? 0,
      currency: (data.currency ?? "PEN").trim(),
      effectiveFrom: (data.effectiveFrom ?? "").trim(),
      active: data.active !== false,
    }
  );
}

export async function updateResourceCost(
  resourceId: string,
  costId: string,
  data: ResourceCostEditInput
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code;
  if (data.name !== undefined) payload.name = data.name;
  if (data.type !== undefined) payload.type = data.type;
  if (data.amount !== undefined) payload.amount = Number(data.amount) ?? 0;
  if (data.currency !== undefined) payload.currency = data.currency;
  if (data.effectiveFrom !== undefined) payload.effectiveFrom = data.effectiveFrom;
  if (data.active !== undefined) payload.active = data.active;
  await updateDocumentInSubcollection(
    COLLECTION,
    resourceId,
    RESOURCE_COSTS_SUB,
    costId,
    payload
  );
}

export async function deleteResourceCost(resourceId: string, costId: string): Promise<void> {
  return deleteDocumentFromSubcollection(
    COLLECTION,
    resourceId,
    RESOURCE_COSTS_SUB,
    costId
  );
}

export async function deleteResourceCosts(
  resourceId: string,
  ids: string[]
): Promise<void> {
  for (const id of ids) {
    await deleteDocumentFromSubcollection(COLLECTION, resourceId, RESOURCE_COSTS_SUB, id);
  }
}
