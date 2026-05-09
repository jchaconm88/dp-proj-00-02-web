import { webFetch } from "~/lib/backend-client";
import type { AccountRecord } from "./accounts.types";

function toRecord(id: string, d: Record<string, unknown>): AccountRecord {
  const status = d.status === "inactive" ? "inactive" : "active";
  return { id, name: String(d.name ?? id), status };
}

export async function getAccountById(id: string): Promise<AccountRecord | null> {
  const raw = await webFetch<Record<string, unknown> | null>(
    `/system/accounts/${encodeURIComponent(id)}`
  );
  if (!raw) return null;
  return toRecord(String(raw.id ?? id), raw);
}