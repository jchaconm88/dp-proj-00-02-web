import { where } from "firebase/firestore";
import {
  addDocument,
  getCollectionWithMultiFilter,
  getDocument,
  updateDocument,
} from "~/lib/firestore.service";
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
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const rows = await getCollectionWithMultiFilter<Record<string, unknown>>(COLLECTION, [
    where("companyId", "==", companyId),
    where("accountId", "==", accountId),
  ]);
  const items = rows.map((d) => toTableRow(toSunatConfigRecord(d)));
  items.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  return { items };
}

export async function getSunatConfigById(id: string): Promise<SunatConfigRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toSunatConfigRecord(d) : null;
}

/** Config vigente: la primera activa; si ninguna está activa, retorna null. */
export async function getActiveSunatConfig(): Promise<SunatConfigRecord | null> {
  const { items } = await listSunatConfigsForTable();
  const active = items.find((x) => x.active !== false) ?? null;
  return active;
}

/** Facturación / SUNAT: solo puede operar si existe config y no está desactivada explícitamente. */
export function isSunatConfigOperational(config: SunatConfigRecord | null): boolean {
  if (!config) return false;
  return config.active !== false;
}

export async function saveSunatConfig(configId: string | null, data: SunatConfigInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const payload = {
    companyId,
    ...(data as Record<string, unknown>),
    name: String(data.name ?? "Configuración SUNAT").trim() || "Configuración SUNAT",
    active: Boolean(data.active),
    accountId,
  };

  let id = configId?.trim() || "";
  if (id) {
    await updateDocument(COLLECTION, id, payload);
  } else {
    id = await addDocument(COLLECTION, payload);
  }

  // Normalización: si esta config se marcó activa, desactiva las demás de la empresa/tenant.
  if (payload.active) {
    const { items } = await listSunatConfigsForTable();
    const others = items.filter((x) => x.id !== id && x.active !== false);
    await Promise.all(others.map((x) => updateDocument(COLLECTION, x.id, { active: false })));
  }

  return id;
}
