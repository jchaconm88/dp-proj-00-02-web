import { getDocument, createDocumentWithId, updateDocument } from "~/lib/firestore.service";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import type { SunatConfigRecord, SunatConfigInput, SunatConfigTableRow } from "./sunat-config.types";

const COLLECTION = "sunat-config";

function environmentLabelFromUrls(billUrl: string): string {
  const u = billUrl.toLowerCase();
  if (u.includes("beta") || u.includes("-beta.")) return "Beta (SUNAT)";
  if (u.includes("e-factura.sunat.gob.pe")) return "Producción";
  return "Personalizado";
}

function toSunatConfigRecord(doc: { id: string } & Record<string, unknown>): SunatConfigRecord {
  const activeRaw = doc.active;
  const active = activeRaw === false ? false : true;
  return {
    id: doc.id,
    name: String(doc.name ?? "Configuración SUNAT").trim() || "Configuración SUNAT",
    active,
    urlServidorSunat: String(doc.urlServidorSunat ?? ""),
    urlConsultaServidorSunat: String(doc.urlConsultaServidorSunat ?? ""),
    usuarioSunat: String(doc.usuarioSunat ?? ""),
    passwordSunat: String(doc.passwordSunat ?? ""),
    certBase64: String(doc.certBase64 ?? ""),
    passwordCertificado: String(doc.passwordCertificado ?? ""),
    hasCert: Boolean(doc.certBase64),
    certOriginalFileName: doc.certOriginalFileName ? String(doc.certOriginalFileName) : undefined,
  };
}

function toTableRow(config: SunatConfigRecord): SunatConfigTableRow {
  return {
    ...config,
    environmentLabel: environmentLabelFromUrls(config.urlServidorSunat),
  };
}

/** Listado para tabla de mantenimiento (como otros maestros): 0 o 1 fila por empresa. */
export async function listSunatConfigsForTable(): Promise<{ items: SunatConfigTableRow[] }> {
  const row = await getSunatConfig();
  return { items: row ? [toTableRow(row)] : [] };
}

export async function getSunatConfig(): Promise<SunatConfigRecord | null> {
  const companyId = requireActiveCompanyId();
  const d = await getDocument<Record<string, unknown>>(COLLECTION, companyId);
  return d ? toSunatConfigRecord(d) : null;
}

/** Facturación / SUNAT: solo puede operar si existe config y no está desactivada explícitamente. */
export function isSunatConfigOperational(config: SunatConfigRecord | null): boolean {
  if (!config) return false;
  return config.active !== false;
}

export async function saveSunatConfig(data: SunatConfigInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const existing = await getDocument<Record<string, unknown>>(COLLECTION, companyId);
  const payload = {
    companyId,
    ...(data as Record<string, unknown>),
    name: String(data.name ?? "Configuración SUNAT").trim() || "Configuración SUNAT",
    active: Boolean(data.active),
    accountId,
  };
  if (existing) {
    await updateDocument(COLLECTION, companyId, payload);
  } else {
    await createDocumentWithId(COLLECTION, companyId, payload);
  }
}
