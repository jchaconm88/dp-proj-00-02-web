import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import {
  BILLING_CYCLE,
  CALCULATION_TYPE,
  CONTRACT_STATUS,
  parseStatus,
  RATE_RULE_TYPE,
} from "~/constants/status-options";
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

function toContractRecord(data: Record<string, unknown> & { id?: string }): ContractRecord {
  return {
    id: String(data.id ?? ""),
    clientId: String(data.clientId ?? ""),
    client: String(data.client ?? ""),
    contractCode: String(data.contractCode ?? ""),
    description: String(data.description ?? ""),
    currency: String(data.currency ?? "PEN"),
    validFrom: String(data.validFrom ?? ""),
    validTo: String(data.validTo ?? ""),
    billingCycle: parseStatus(data.billingCycle, BILLING_CYCLE) as BillingCycle,
    paymentTermsDays: Number(data.paymentTermsDays) || 30,
    status: parseStatus(data.status, CONTRACT_STATUS) as ContractStatus,
  };
}

function toRateRuleRecord(data: Record<string, unknown> & { id?: string }): RateRuleRecord {
  return {
    id: String(data.id ?? ""),
    code: String(data.code ?? ""),
    name: String(data.name ?? ""),
    active: data.active === true,
    priority: Number(data.priority) || 0,
    ruleType: parseStatus(data.ruleType, RATE_RULE_TYPE) as RateRuleType,
    calculationType: parseStatus(data.calculationType, CALCULATION_TYPE) as CalculationType,
    transportServiceId: String(data.transportServiceId ?? ""),
    transportService: String(data.transportService ?? ""),
    vehicleType: String(data.vehicleType ?? ""),
    conditions: toConditions(data.conditions),
    calculation: toCalculation(data.calculation),
    stackable: data.stackable === true,
    validFrom: String(data.validFrom ?? ""),
    validTo: String(data.validTo ?? ""),
  };
}

export async function getContract(id: string): Promise<ContractRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/transport/transport-contracts/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toContractRecord(data) : null;
}

export async function getContracts(): Promise<{ items: ContractRecord[]; total: number }> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ items: ContractRecord[]; total: number }>(
    `/transport/transport-contracts?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: res.items ?? [], total: res.total ?? 0 };
}

export async function addContract(data: ContractAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ id: string }>("/transport/transport-contracts", {
    method: "POST",
    body: JSON.stringify({
      companyId,
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
    }),
  });
  return res.id;
}

export async function updateContract(id: string, data: ContractEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
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
  await webFetch(`/transport/transport-contracts/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, ...payload }),
  });
}

export async function deleteContract(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/transport/transport-contracts/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}

export async function getRateRules(contractId: string): Promise<{ items: RateRuleRecord[]; total: number }> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ items: RateRuleRecord[]; total: number }>(
    `/transport/transport-contracts/${encodeURIComponent(contractId)}/transport-rate-rules?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: res.items ?? [], total: res.total ?? 0 };
}

export async function getRateRule(contractId: string, ruleId: string): Promise<RateRuleRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/transport/transport-contracts/${encodeURIComponent(contractId)}/transport-rate-rules/${encodeURIComponent(ruleId)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toRateRuleRecord(data) : null;
}

export async function addRateRule(contractId: string, data: RateRuleAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ id: string }>(
    `/transport/transport-contracts/${encodeURIComponent(contractId)}/transport-rate-rules`,
    {
      method: "POST",
      body: JSON.stringify({
        companyId,
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
      }),
    }
  );
  return res.id;
}

export async function updateRateRule(contractId: string, ruleId: string, data: RateRuleEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
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
  await webFetch(
    `/transport/transport-contracts/${encodeURIComponent(contractId)}/transport-rate-rules/${encodeURIComponent(ruleId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ companyId, ...payload }),
    }
  );
}

export async function deleteRateRule(contractId: string, ruleId: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/transport/transport-contracts/${encodeURIComponent(contractId)}/transport-rate-rules/${encodeURIComponent(ruleId)}?companyId=${encodeURIComponent(companyId)}`,
    { method: "DELETE" }
  );
}