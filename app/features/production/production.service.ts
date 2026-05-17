import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import type {
  RecipeRecord, RecipeAddInput, RecipeEditInput,
  RecipeMaterialRecord, RecipeMaterialAddInput, RecipeMaterialEditInput,
  RecipeResultRecord, RecipeResultAddInput, RecipeResultEditInput,
  ProductionOrderRecord, OrderAddInput, OrderEditInput,
  OrderMaterialRecord, OrderResultRecord, OrderResultEditInput,
  ProductionCostRecord, CostAddInput, CostEditInput,
  MaterialSummaryRecord,
} from "./production.types";

function toRecipeRecord(raw: Record<string, unknown>): RecipeRecord {
  return raw as unknown as RecipeRecord;
}

function toRecipeMaterialRecord(raw: Record<string, unknown>): RecipeMaterialRecord {
  return raw as unknown as RecipeMaterialRecord;
}

function toRecipeResultRecord(raw: Record<string, unknown>): RecipeResultRecord {
  return raw as unknown as RecipeResultRecord;
}

function toProductionOrderRecord(raw: Record<string, unknown>): ProductionOrderRecord {
  return raw as unknown as ProductionOrderRecord;
}

function toOrderMaterialRecord(raw: Record<string, unknown>): OrderMaterialRecord {
  return raw as unknown as OrderMaterialRecord;
}

function toOrderResultRecord(raw: Record<string, unknown>): OrderResultRecord {
  return raw as unknown as OrderResultRecord;
}

function toProductionCostRecord(raw: Record<string, unknown>): ProductionCostRecord {
  return raw as unknown as ProductionCostRecord;
}

function toMaterialSummaryRecord(raw: Record<string, unknown>): MaterialSummaryRecord {
  return raw as unknown as MaterialSummaryRecord;
}

// ─── Recipes ──────────────────────────────────────────────────────────────────

export async function getRecipes(filters?: { status?: string }): Promise<{ items: RecipeRecord[] }> {
  const companyId = requireActiveCompanyId();
  const params = new URLSearchParams({ companyId });
  if (filters?.status) params.set("status", filters.status);
  const data = await webFetch<{ items: Record<string, unknown>[] }>(`/production/recipes?${params}`);
  return { items: (data.items ?? []).map(toRecipeRecord) };
}

export async function getRecipeById(id: string): Promise<RecipeRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(`/production/recipes/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`);
  return data ? toRecipeRecord(data) : null;
}

export async function addRecipe(data: RecipeAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const result = await webFetch<{ id: string }>("/production/recipes", {
    method: "POST",
    body: JSON.stringify({ companyId, ...data }),
  });
  return result.id;
}

export async function updateRecipe(id: string, data: RecipeEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/production/recipes/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, ...data }),
  });
}

export async function deleteRecipe(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/production/recipes/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}

export async function deleteRecipes(ids: string[]): Promise<void> {
  for (const id of ids) {
    await deleteRecipe(id);
  }
}

export async function activateRecipe(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/production/recipes/${encodeURIComponent(id)}/activate`, {
    method: "POST",
    body: JSON.stringify({ companyId }),
  });
}

export async function deactivateRecipe(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/production/recipes/${encodeURIComponent(id)}/deactivate`, {
    method: "POST",
    body: JSON.stringify({ companyId }),
  });
}

// ─── Recipe Materials ─────────────────────────────────────────────────────────

export async function getRecipeMaterials(recipeId: string): Promise<{ items: RecipeMaterialRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/production/recipes/${encodeURIComponent(recipeId)}/materials?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: (data.items ?? []).map(toRecipeMaterialRecord) };
}

export async function getRecipeMaterialById(recipeId: string, materialId: string): Promise<RecipeMaterialRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/production/recipes/${encodeURIComponent(recipeId)}/materials/${encodeURIComponent(materialId)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toRecipeMaterialRecord(data) : null;
}

export async function addRecipeMaterial(recipeId: string, data: RecipeMaterialAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const result = await webFetch<{ id: string }>(
    `/production/recipes/${encodeURIComponent(recipeId)}/materials`,
    { method: "POST", body: JSON.stringify({ companyId, ...data }) }
  );
  return result.id;
}

export async function updateRecipeMaterial(recipeId: string, materialId: string, data: RecipeMaterialEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/production/recipes/${encodeURIComponent(recipeId)}/materials/${encodeURIComponent(materialId)}`,
    { method: "PUT", body: JSON.stringify({ companyId, ...data }) }
  );
}

export async function deleteRecipeMaterial(recipeId: string, materialId: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/production/recipes/${encodeURIComponent(recipeId)}/materials/${encodeURIComponent(materialId)}?companyId=${encodeURIComponent(companyId)}`,
    { method: "DELETE" }
  );
}

// ─── Recipe Results ───────────────────────────────────────────────────────────

export async function getRecipeResults(recipeId: string): Promise<{ items: RecipeResultRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/production/recipes/${encodeURIComponent(recipeId)}/results?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: (data.items ?? []).map(toRecipeResultRecord) };
}

export async function getRecipeResultById(recipeId: string, resultId: string): Promise<RecipeResultRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/production/recipes/${encodeURIComponent(recipeId)}/results/${encodeURIComponent(resultId)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toRecipeResultRecord(data) : null;
}

export async function addRecipeResult(recipeId: string, data: RecipeResultAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const result = await webFetch<{ id: string }>(
    `/production/recipes/${encodeURIComponent(recipeId)}/results`,
    { method: "POST", body: JSON.stringify({ companyId, ...data }) }
  );
  return result.id;
}

export async function updateRecipeResult(recipeId: string, resultId: string, data: RecipeResultEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/production/recipes/${encodeURIComponent(recipeId)}/results/${encodeURIComponent(resultId)}`,
    { method: "PUT", body: JSON.stringify({ companyId, ...data }) }
  );
}

export async function deleteRecipeResult(recipeId: string, resultId: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/production/recipes/${encodeURIComponent(recipeId)}/results/${encodeURIComponent(resultId)}?companyId=${encodeURIComponent(companyId)}`,
    { method: "DELETE" }
  );
}

// ─── Production Orders ────────────────────────────────────────────────────────

export async function getOrders(filters?: {
  status?: string; recipeId?: string; dateFrom?: string; dateTo?: string; productId?: string;
}): Promise<{ items: ProductionOrderRecord[] }> {
  const companyId = requireActiveCompanyId();
  const params = new URLSearchParams({ companyId });
  if (filters?.status) params.set("status", filters.status);
  if (filters?.recipeId) params.set("recipeId", filters.recipeId);
  if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.set("dateTo", filters.dateTo);
  if (filters?.productId) params.set("productId", filters.productId);
  const data = await webFetch<{ items: Record<string, unknown>[] }>(`/production/orders?${params}`);
  return { items: (data.items ?? []).map(toProductionOrderRecord) };
}

export async function getOrderById(id: string): Promise<ProductionOrderRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(`/production/orders/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`);
  return data ? toProductionOrderRecord(data) : null;
}

export async function addOrder(data: OrderAddInput): Promise<{ id: string; code: string }> {
  const companyId = requireActiveCompanyId();
  const result = await webFetch<{ id: string; code: string }>("/production/orders", {
    method: "POST",
    body: JSON.stringify({ companyId, ...data }),
  });
  return result;
}

export async function updateOrder(id: string, data: OrderEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/production/orders/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, ...data }),
  });
}

export async function deleteOrder(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/production/orders/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}

export async function deleteOrders(ids: string[]): Promise<void> {
  for (const id of ids) {
    await deleteOrder(id);
  }
}

export async function transitionOrder(id: string, data: { targetStatus: string; realQuantityProduced?: number }): Promise<{ ok: boolean; status: string }> {
  const companyId = requireActiveCompanyId();
  return await webFetch<{ ok: boolean; status: string }>(
    `/production/orders/${encodeURIComponent(id)}/transition`,
    { method: "POST", body: JSON.stringify({ companyId, ...data }) }
  );
}

// ─── Order Materials (read-only) ──────────────────────────────────────────────

export async function getOrderMaterials(orderId: string): Promise<{ items: OrderMaterialRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/production/orders/${encodeURIComponent(orderId)}/materials?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: (data.items ?? []).map(toOrderMaterialRecord) };
}

// ─── Order Results ────────────────────────────────────────────────────────────

export async function getOrderResults(orderId: string): Promise<{ items: OrderResultRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/production/orders/${encodeURIComponent(orderId)}/results?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: (data.items ?? []).map(toOrderResultRecord) };
}

export async function getOrderResultById(orderId: string, resultId: string): Promise<OrderResultRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/production/orders/${encodeURIComponent(orderId)}/results/${encodeURIComponent(resultId)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toOrderResultRecord(data) : null;
}

export async function updateOrderResult(orderId: string, resultId: string, data: OrderResultEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/production/orders/${encodeURIComponent(orderId)}/results/${encodeURIComponent(resultId)}`,
    { method: "PUT", body: JSON.stringify({ companyId, ...data }) }
  );
}

// ─── Costs ────────────────────────────────────────────────────────────────────

export async function getOrderCosts(orderId: string): Promise<{ items: ProductionCostRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/production/orders/${encodeURIComponent(orderId)}/costs?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: (data.items ?? []).map(toProductionCostRecord) };
}

export async function getOrderCostById(orderId: string, costId: string): Promise<ProductionCostRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/production/orders/${encodeURIComponent(orderId)}/costs/${encodeURIComponent(costId)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toProductionCostRecord(data) : null;
}

export async function addOrderCost(orderId: string, data: CostAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const result = await webFetch<{ id: string }>(
    `/production/orders/${encodeURIComponent(orderId)}/costs`,
    { method: "POST", body: JSON.stringify({ companyId, ...data }) }
  );
  return result.id;
}

export async function updateOrderCost(orderId: string, costId: string, data: CostEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/production/orders/${encodeURIComponent(orderId)}/costs/${encodeURIComponent(costId)}`,
    { method: "PUT", body: JSON.stringify({ companyId, ...data }) }
  );
}

export async function deleteOrderCost(orderId: string, costId: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/production/orders/${encodeURIComponent(orderId)}/costs/${encodeURIComponent(costId)}?companyId=${encodeURIComponent(companyId)}`,
    { method: "DELETE" }
  );
}

// ─── Planning ─────────────────────────────────────────────────────────────────

export async function getPlanningOrders(dateFrom: string, dateTo: string): Promise<{ items: ProductionOrderRecord[] }> {
  const companyId = requireActiveCompanyId();
  const params = new URLSearchParams({ companyId, dateFrom, dateTo });
  const data = await webFetch<{ items: Record<string, unknown>[] }>(`/production/planning?${params}`);
  return { items: (data.items ?? []).map(toProductionOrderRecord) };
}

export async function getMaterialsSummary(dateFrom: string, dateTo: string): Promise<{ items: MaterialSummaryRecord[] }> {
  const companyId = requireActiveCompanyId();
  const params = new URLSearchParams({ companyId, dateFrom, dateTo });
  const data = await webFetch<{ items: Record<string, unknown>[] }>(`/production/planning/materials-summary?${params}`);
  return { items: (data.items ?? []).map(toMaterialSummaryRecord) };
}
