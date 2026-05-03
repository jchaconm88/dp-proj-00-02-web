import { auth } from "~/lib/firebase";
import { getAuthUser } from "~/lib/get-auth-user";

export async function webFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const configured = String(import.meta.env.VITE_WEB_BACKEND_BASE_URL ?? "").trim().replace(/\/$/, "");
  const base = configured || (import.meta.env.DEV ? "/web-backend" : "");
  if (!base) throw new Error("Falta VITE_WEB_BACKEND_BASE_URL (build/prod)");
  const user = auth.currentUser ?? (await getAuthUser());
  if (!user) throw new Error("Sesión no lista: no hay usuario autenticado.");
  const token = await user.getIdToken(true);
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const raw = text.trim();
    let detail = raw;
    if (raw) {
      try {
        const j = JSON.parse(raw) as { error?: unknown; message?: unknown };
        const err = j?.error != null ? String(j.error) : "";
        const msg = j?.message != null ? String(j.message) : "";
        const combined = [err, msg].filter(Boolean).join(": ");
        if (combined) detail = combined;
      } catch {
        /* usar cuerpo tal cual */
      }
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[webFetch]", res.status, init?.method ?? "GET", url, detail || raw || "(sin cuerpo)");
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
