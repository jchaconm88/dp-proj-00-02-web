import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import type { DashboardDefinitionsResponse, OverrideEntry } from "./dashboard-config.types";

/**
 * Fetches all merged metric definitions (defaults + customs) filtered by target=web|both.
 * Uses GET /web/dashboard-config/metrics.
 */
export async function getMetrics(): Promise<any[]> {
  return webFetch<any[]>("/dashboard-config/metrics");
}

/**
 * Creates a new metric definition.
 * Uses POST /web/dashboard-config/metrics.
 */
export async function createMetric(data: any): Promise<{ id: string }> {
  return webFetch<{ id: string }>("/dashboard-config/metrics", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Updates an existing metric definition.
 * Uses PUT /web/dashboard-config/metrics/:id.
 */
export async function updateMetric(id: string, data: any): Promise<void> {
  await webFetch<void>(`/dashboard-config/metrics/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Deletes a metric definition.
 * Uses DELETE /web/dashboard-config/metrics/:id.
 */
export async function deleteMetric(id: string): Promise<void> {
  await webFetch<void>(`/dashboard-config/metrics/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/**
 * Fetches card and chart definitions available for the active company (target=web|both).
 * Uses GET /web/dashboard-config/definitions with companyId query param.
 */
export async function getDefinitions(companyId: string): Promise<DashboardDefinitionsResponse> {
  const query = new URLSearchParams({ companyId }).toString();
  return webFetch<DashboardDefinitionsResponse>(`/dashboard-config/definitions?${query}`);
}

/**
 * Saves company-level overrides for card/chart visibility and order.
 * Uses PUT /web/dashboard-config/overrides.
 */
export async function saveOverrides(companyId: string, entries: OverrideEntry[]): Promise<void> {
  await webFetch<void>("/dashboard-config/overrides", {
    method: "PUT",
    body: JSON.stringify({ companyId, entries }),
  });
}

/**
 * Convenience wrapper that resolves the active company automatically.
 */
export async function loadDefinitions(): Promise<DashboardDefinitionsResponse> {
  const companyId = requireActiveCompanyId();
  return getDefinitions(companyId);
}

/**
 * Convenience wrapper that resolves the active company automatically.
 */
export async function saveCompanyOverrides(entries: OverrideEntry[]): Promise<void> {
  const companyId = requireActiveCompanyId();
  return saveOverrides(companyId, entries);
}

// ─── Cards CRUD ──────────────────────────────────────────────────────────────

/**
 * Fetches all card definitions filtered by target=web|both.
 */
export async function getCards(): Promise<any[]> {
  const companyId = requireActiveCompanyId();
  const data = await getDefinitions(companyId);
  return data.cards;
}

/**
 * Creates a new card definition.
 * Uses POST /web/dashboard-config/cards.
 */
export async function createCard(data: any): Promise<{ id: string }> {
  return webFetch<{ id: string }>("/dashboard-config/cards", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Updates an existing card definition.
 * Uses PUT /web/dashboard-config/cards/:id.
 */
export async function updateCard(id: string, data: any): Promise<void> {
  await webFetch<void>(`/dashboard-config/cards/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Deletes a card definition.
 * Uses DELETE /web/dashboard-config/cards/:id.
 */
export async function deleteCard(id: string): Promise<void> {
  await webFetch<void>(`/dashboard-config/cards/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ─── Charts CRUD ─────────────────────────────────────────────────────────────

/**
 * Fetches all chart definitions filtered by target=web|both.
 */
export async function getCharts(): Promise<any[]> {
  const companyId = requireActiveCompanyId();
  const data = await getDefinitions(companyId);
  return data.charts;
}

/**
 * Creates a new chart definition.
 * Uses POST /web/dashboard-config/charts.
 */
export async function createChart(data: any): Promise<{ id: string }> {
  return webFetch<{ id: string }>("/dashboard-config/charts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Updates an existing chart definition.
 * Uses PUT /web/dashboard-config/charts/:id.
 */
export async function updateChart(id: string, data: any): Promise<void> {
  await webFetch<void>(`/dashboard-config/charts/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Deletes a chart definition.
 * Uses DELETE /web/dashboard-config/charts/:id.
 */
export async function deleteChart(id: string): Promise<void> {
  await webFetch<void>(`/dashboard-config/charts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
