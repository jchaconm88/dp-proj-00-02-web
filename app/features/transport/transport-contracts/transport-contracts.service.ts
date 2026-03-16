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
  ContractRecord,
  ContractAddInput,
  ContractEditInput,
  ContractStatus,
  BillingCycle,
  RateRuleRecord,
  RateRuleAddInput,
  RateRuleEditInput,
  RateRuleType,
  CalculationType,
  RateRuleConditions,
  RateRuleCalculation,
} from "./transport-contracts.types";

const COLLECTION = "transport-contracts";
const RATE_RULES_SUB = "transport-rate-rules";

// -- Mapper helpers --
function toContractStatus(v: unknown): ContractStatus {
  const s = String(v ?? "").toLowerCase();
  if (s === "active" || s === "expired" || s === "cancelled") return s as ContractStatus;
  return "draft";
}

function toBillingCycle(v: unknown): BillingCycle {
  const s = String(v ?? "").toLowerCase();
  if (s === "weekly" || s === "per_trip") return s as BillingCycle;
  return "monthly";
}

function toContractRecord(doc: { id: string } & Record<string, unknown>): ContractRecord {
  return {
    id: doc.id,
    clientId: String(doc.clientId ?? ""),
    client: String(doc.client ?? ""),
    contractCode: String(doc.contractCode ?? ""),
    description: String(doc.description ?? ""),
    currency: String(doc.currency ?? "PEN"),
    validFrom: String(doc.validFrom ?? ""),
    validTo: String(doc.validTo ?? ""),
    billingCycle: toBillingCycle(doc.billingCycle),
    paymentTermsDays: Number(doc.paymentTermsDays) || 30,
    status: toContractStatus(doc.status),
  };
}

function toConditions(v: unknown): RateRuleConditions {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  return {
    originZone: o.originZone != null ? String(o.originZone) : null,
    destinationZone: o.destinationZone != null ? String(o.destinationZone) : null,
    minWeight: o.minWeight != null ? Number(o.minWeight) : null,
    maxWeight: o.maxWeight != null ? Number(o.maxWeight) : null,
    minDistanceKm: o.minDistanceKm != null ? Number(o.minDistanceKm) : null,
    maxDistanceKm: o.maxDistanceKm != null ? Number(o.maxDistanceKm) : null,
    priorityLevel: o.priorityLevel != null ? String(o.priorityLevel) : null,
    dayOfWeek: o.dayOfWeek != null ? String(o.dayOfWeek) : null,
  };
}

function toCalculation(v: unknown): RateRuleCalculation {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  return {
    basePrice: o.basePrice != null ? Number(o.basePrice) : null,
    pricePerKm: o.pricePerKm != null ? Number(o.pricePerKm) : null,
    pricePerTon: o.pricePerTon != null ? Number(o.pricePerTon) : null,
    pricePerM3: o.pricePerM3 != null ? Number(o.pricePerM3) : null,
    percentage: o.percentage != null ? Number(o.percentage) : null,
  };
}

function toRuleType(v: unknown): RateRuleType {
  const s = String(v ?? "").toLowerCase();
  if (s === "extra_charge" || s === "penalty" || s === "discount") return s as RateRuleType;
  return "base";
}

function toCalculationType(v: unknown): CalculationType {
  const s = String(v ?? "").toLowerCase();
  if (
    s === "zone" ||
    s === "per_km" ||
    s === "per_weight" ||
    s === "per_volume" ||
    s === "percentage" ||
    s === "formula"
  )
    return s as CalculationType;
  return "fixed";
}

function toRateRuleRecord(doc: { id: string } & Record<string, unknown>): RateRuleRecord {
  return {
    id: doc.id,
    code: String(doc.code ?? ""),
    name: String(doc.name ?? ""),
    active: doc.active === true,
    priority: Number(doc.priority) || 0,
    ruleType: toRuleType(doc.ruleType),
    calculationType: toCalculationType(doc.calculationType),
    transportServiceId: String(doc.transportServiceId ?? ""),
    transportService: String(doc.transportService ?? ""),
    vehicleType: String(doc.vehicleType ?? ""),
    conditions: toConditions(doc.conditions),
    calculation: toCalculation(doc.calculation),
    stackable: doc.stackable === true,
    validFrom: String(doc.validFrom ?? ""),
    validTo: String(doc.validTo ?? ""),
  };
}

// --- Contracts API ---
export async function getContract(id: string): Promise<ContractRecord | null> {
  const doc = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return doc ? toContractRecord(doc) : null;
}

export async function getContracts(): Promise<{ items: ContractRecord[]; total: number }> {
  const list = await getCollection<Record<string, unknown>>(COLLECTION);
  const items = list.map(toContractRecord);
  return { items, total: items.length };
}

export async function addContract(data: ContractAddInput): Promise<string> {
  return addDocument(COLLECTION, {
    clientId: data.clientId.trim(),
    client: data.client.trim(),
    contractCode: data.contractCode.trim(),
    description: data.description.trim(),
    currency: data.currency.trim() || "PEN",
    validFrom: data.validFrom.trim(),
    validTo: data.validTo.trim(),
    billingCycle: data.billingCycle,
    paymentTermsDays: Number(data.paymentTermsDays) || 30,
    status: data.status,
  });
}

export async function updateContract(id: string, data: ContractEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.clientId !== undefined) payload.clientId = data.clientId;
  if (data.client !== undefined) payload.client = data.client;
  if (data.contractCode !== undefined) payload.contractCode = data.contractCode;
  if (data.description !== undefined) payload.description = data.description;
  if (data.currency !== undefined) payload.currency = data.currency;
  if (data.validFrom !== undefined) payload.validFrom = data.validFrom;
  if (data.validTo !== undefined) payload.validTo = data.validTo;
  if (data.billingCycle !== undefined) payload.billingCycle = data.billingCycle;
  if (data.paymentTermsDays !== undefined) payload.paymentTermsDays = Number(data.paymentTermsDays) || 30;
  if (data.status !== undefined) payload.status = data.status;
  await updateDocument(COLLECTION, id, payload);
}

export async function deleteContract(id: string): Promise<void> {
  return deleteDocument(COLLECTION, id);
}

export async function deleteContracts(ids: string[]): Promise<void> {
  return deleteManyDocuments(COLLECTION, ids);
}

// --- Rate Rules API ---
export async function getRateRules(contractId: string): Promise<{ items: RateRuleRecord[]; total: number }> {
  const list = await getSubcollection<Record<string, unknown>>(COLLECTION, contractId, RATE_RULES_SUB);
  const items = list.map(toRateRuleRecord).sort((a, b) => a.priority - b.priority);
  return { items, total: items.length };
}

export async function getRateRule(contractId: string, ruleId: string): Promise<RateRuleRecord | null> {
  const doc = await getDocumentFromSubcollection<Record<string, unknown>>(
    COLLECTION,
    contractId,
    RATE_RULES_SUB,
    ruleId
  );
  return doc ? toRateRuleRecord(doc) : null;
}

export async function addRateRule(contractId: string, data: RateRuleAddInput): Promise<string> {
  return addDocumentToSubcollection(COLLECTION, contractId, RATE_RULES_SUB, {
    code: data.code.trim(),
    name: data.name.trim(),
    active: data.active,
    priority: Number(data.priority) || 0,
    ruleType: data.ruleType,
    calculationType: data.calculationType,
    transportServiceId: data.transportServiceId.trim(),
    transportService: data.transportService.trim(),
    vehicleType: data.vehicleType.trim(),
    conditions: data.conditions ?? {},
    calculation: data.calculation ?? {},
    stackable: data.stackable,
    validFrom: data.validFrom.trim(),
    validTo: data.validTo.trim(),
  });
}

export async function updateRateRule(
  contractId: string,
  ruleId: string,
  data: RateRuleEditInput
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code;
  if (data.name !== undefined) payload.name = data.name;
  if (data.active !== undefined) payload.active = data.active;
  if (data.priority !== undefined) payload.priority = Number(data.priority) || 0;
  if (data.ruleType !== undefined) payload.ruleType = data.ruleType;
  if (data.calculationType !== undefined) payload.calculationType = data.calculationType;
  if (data.transportServiceId !== undefined) payload.transportServiceId = data.transportServiceId;
  if (data.transportService !== undefined) payload.transportService = data.transportService;
  if (data.vehicleType !== undefined) payload.vehicleType = data.vehicleType;
  if (data.conditions !== undefined) payload.conditions = data.conditions;
  if (data.calculation !== undefined) payload.calculation = data.calculation;
  if (data.stackable !== undefined) payload.stackable = data.stackable;
  if (data.validFrom !== undefined) payload.validFrom = data.validFrom;
  if (data.validTo !== undefined) payload.validTo = data.validTo;

  await updateDocumentInSubcollection(COLLECTION, contractId, RATE_RULES_SUB, ruleId, payload);
}

export async function deleteRateRule(contractId: string, ruleId: string): Promise<void> {
  return deleteDocumentFromSubcollection(COLLECTION, contractId, RATE_RULES_SUB, ruleId);
}

export async function deleteRateRules(contractId: string, ruleIds: string[]): Promise<void> {
  const promises = ruleIds.map((id) =>
    deleteDocumentFromSubcollection(COLLECTION, contractId, RATE_RULES_SUB, id)
  );
  await Promise.all(promises);
}
