import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import type { SunatConfigRecord, SunatConfigInput, SunatConfigTableRow } from "./sunat-config.types";

function environmentLabelFromUrls(billUrl: string): string {
  const u = billUrl.toLowerCase();
  if (u.includes("beta") || u.includes("-beta.")) return "Beta (SUNAT)";
  if (u.includes("e-factura.sunat.gob.pe")) return "Producción";
  return "Personalizado";
}

function toSunatConfigRecord(data: Record<string, unknown>): SunatConfigRecord {
  const activeRaw = data.active;
  const active = activeRaw === false ? false : true;
  return {
    id: String(data.id ?? ""),
    name: String(data.name ?? "Configuración SUNAT").trim() || "Configuración SUNAT",
    active,
    urlServidorSunat: String(data.urlServidorSunat ?? ""),
    urlConsultaServidorSunat: String(data.urlConsultaServidorSunat ?? ""),
    usuarioSunat: String(data.usuarioSunat ?? ""),
    passwordSunat: String(data.passwordSunat ?? ""),
    certBase64: String(data.certBase64 ?? ""),
    passwordCertificado: String(data.passwordCertificado ?? ""),
    hasCert: Boolean(data.certBase64),
    certOriginalFileName: data.certOriginalFileName != null ? String(data.certOriginalFileName) : undefined,
  };
}

function toTableRow(config: SunatConfigRecord): SunatConfigTableRow {
  return { ...config, environmentLabel: environmentLabelFromUrls(config.urlServidorSunat) };
}

export async function listSunatConfigsForTable(): Promise<{ items: SunatConfigTableRow[] }> {
  const companyId = requireActiveCompanyId();
  const result = await webFetch<{ items: Record<string, unknown>[] }>(
    `/billing/sunat-config?companyId=${companyId}`
  );
  const items = result.items.map((d) => toTableRow(toSunatConfigRecord(d)));
  items.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  return { items };
}

export async function getSunatConfigById(id: string): Promise<SunatConfigRecord | null> {
  const result = await webFetch<Record<string, unknown> | null>(
    `/billing/sunat-config/${id}?companyId=${requireActiveCompanyId()}`
  );
  return result ? toSunatConfigRecord(result) : null;
}

export async function getActiveSunatConfig(): Promise<SunatConfigRecord | null> {
  const { items } = await listSunatConfigsForTable();
  const active = items.find((x) => x.active !== false) ?? null;
  return active;
}

export function isSunatConfigOperational(config: SunatConfigRecord | null): boolean {
  if (!config) return false;
  return config.active !== false;
}

export async function saveSunatConfig(configId: string | null, data: SunatConfigInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const payload = {
    companyId,
    name: String(data.name ?? "Configuración SUNAT").trim() || "Configuración SUNAT",
    active: Boolean(data.active),
    urlServidorSunat: data.urlServidorSunat,
    urlConsultaServidorSunat: data.urlConsultaServidorSunat,
    usuarioSunat: data.usuarioSunat,
    passwordSunat: data.passwordSunat,
    certBase64: data.certBase64,
    passwordCertificado: data.passwordCertificado,
    ...(data.certOriginalFileName != null && { certOriginalFileName: data.certOriginalFileName }),
  };

  if (configId?.trim()) {
    await webFetch(`/billing/sunat-config/${configId.trim()}`, { method: "PUT", body: JSON.stringify(payload) });
    return configId.trim();
  }

  const result = await webFetch<{ ok: boolean; id: string }>("/billing/sunat-config", { method: "POST", body: JSON.stringify(payload) });
  return result.id;
}