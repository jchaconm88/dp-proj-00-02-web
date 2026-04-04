import { auth } from "./firebase";
import { getCompanyById } from "~/features/system/companies";

function storageKey(uid: string) {
  return `active-company:${uid}`;
}

function readCompanyIdFromStorageKey(key: string): string | null {
  try {
    const v = window.localStorage.getItem(key);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

function inferSingleStoredCompanyId(): string | null {
  try {
    const prefix = "active-company:";
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    if (keys.length !== 1) return null;
    return readCompanyIdFromStorageKey(keys[0]);
  } catch {
    return null;
  }
}

export function getActiveCompanyId(): string | null {
  const uid = auth.currentUser?.uid;
  if (uid) {
    const byUid = readCompanyIdFromStorageKey(storageKey(uid));
    if (byUid) return byUid;
  }
  // En hard-refresh, auth.currentUser puede tardar en hidratarse:
  // si solo hay una empresa persistida en este navegador, úsala como fallback.
  return inferSingleStoredCompanyId();
}

export function requireActiveCompanyId(): string {
  const id = getActiveCompanyId();
  if (!id) throw new Error("No hay empresa activa seleccionada.");
  return id;
}

/**
 * `accountId` de la empresa activa (`companies.accountId`), o el id de empresa si aún no hay cuenta.
 */
export async function resolveActiveAccountId(): Promise<string> {
  const companyId = requireActiveCompanyId();
  const c = await getCompanyById(companyId);
  const a = c?.accountId?.trim();
  return a || companyId;
}

/** Comprueba tenant en un doc ya leído (acepta docs sin `accountId` hasta backfill). */
export function documentMatchesActiveTenant(
  d: Record<string, unknown>,
  companyId: string,
  accountId: string
): boolean {
  if (String(d.companyId ?? "") !== companyId) return false;
  const da = d.accountId;
  if (da == null || String(da).trim() === "") return true;
  return String(da) === accountId;
}

