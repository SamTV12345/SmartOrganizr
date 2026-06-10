import { apiFetch } from "@/src/api/client";
import type { Author, Folder, Note } from "@/src/api/types";
import { replaceAllStores, setLastSyncedAt } from "./offlineDb";

type OfflinePayload = { authors: Author[]; folders: Folder[]; notes: Note[] };

function isValidPayload(p: unknown): p is OfflinePayload {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return Array.isArray(o.authors) && Array.isArray(o.folders) && Array.isArray(o.notes);
}

/** Pull the full metadata payload and full-replace local stores. Throws WITHOUT mutating data on failure. */
export async function syncNow(): Promise<void> {
  const { data, error } = await apiFetch.GET("/v1/users/offline");
  if (error || !data) throw new Error("offline sync: request failed");
  if (!isValidPayload(data as unknown)) throw new Error("offline sync: malformed payload");
  const payload = data as unknown as OfflinePayload;
  await replaceAllStores(payload.authors, payload.folders, payload.notes);
  await setLastSyncedAt(Date.now());
}
