import { auth } from "./firebase";

function storageKey(uid: string) {
  return `active-company:${uid}`;
}

export function getActiveCompanyId(): string | null {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  try {
    const v = window.localStorage.getItem(storageKey(uid));
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function requireActiveCompanyId(): string {
  const id = getActiveCompanyId();
  if (!id) throw new Error("No hay empresa activa seleccionada.");
  return id;
}

