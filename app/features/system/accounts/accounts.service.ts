import { getDocument } from "~/lib/firestore.service";
import type { AccountRecord } from "./accounts.types";

const COLLECTION = "accounts";

type AccountDoc = {
  name?: string;
  status?: string;
};

function toRecord(id: string, d: AccountDoc): AccountRecord {
  const status = d.status === "inactive" ? "inactive" : "active";
  return { id, name: d.name ?? id, status };
}

export async function getAccountById(id: string): Promise<AccountRecord | null> {
  const snap = await getDocument<AccountDoc>(COLLECTION, id);
  if (!snap) return null;
  return toRecord(snap.id, snap);
}
