import { PROFILES_COLLECTION } from "~/lib/auth-context";
import { updateDocument, deleteDocument } from "~/lib/firestore.service";
import { apiListUsers } from "~/features/system/system-store/system-store.api";
import type { ProfileRecord } from "./users.types";

export async function getProfiles(): Promise<{ items: ProfileRecord[]; last: null }> {
  return apiListUsers();
}

export async function saveProfile(
  id: string,
  data: Pick<ProfileRecord, "email" | "displayName">
): Promise<void> {
  await updateDocument(PROFILES_COLLECTION, id, {
    email: data.email,
    displayName: data.displayName,
  });
}

export async function deleteProfile(id: string): Promise<void> {
  await deleteDocument(PROFILES_COLLECTION, id);
}
