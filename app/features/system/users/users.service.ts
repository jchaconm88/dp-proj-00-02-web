import { webFetch } from "~/lib/backend-client";
import { apiListUsers } from "~/features/system/system-store/system-store.api";
import type { ProfileRecord } from "./users.types";

const BASE = "/platform/users";

export async function getProfiles(): Promise<{ items: ProfileRecord[]; last: null }> {
  return apiListUsers();
}

export async function saveProfile(
  id: string,
  data: Pick<ProfileRecord, "email" | "displayName">
): Promise<void> {
  await webFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteProfile(id: string): Promise<void> {
  await webFetch(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
}
