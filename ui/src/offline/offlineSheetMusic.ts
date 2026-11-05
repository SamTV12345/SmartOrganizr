import { getOfflineDb } from "./offlineDb";

// Sheet music saved for the play mode. A concert hall or rehearsal room often
// has no network, so a setlist can be stored with all its PDFs before the gig.
//
// Two stores:
//  - offlinePdfs:     one record per note, the PDF blob itself
//  - offlineSetlists: one record per setlist source (note / concert / event),
//                     holding the raw API response the play mode loads, so the
//                     $api offline fallback can replay it unchanged.
// PDFs are shared between setlists and only dropped when no setlist uses them.

const PDFS = "offlinePdfs";
const SETLISTS = "offlineSetlists";

export interface OfflinePdf {
  noteId: string;
  blob: Blob;
  bytes: number;
  savedAt: number;
}

export interface OfflineSetlist {
  /** sourceKey of the play-mode source, e.g. "event:club:event". */
  key: string;
  title: string;
  /** Path of the GET request whose response is stored, e.g. "/v1/concerts/c1". */
  apiPath: string;
  /** Raw JSON body of that response. */
  response: unknown;
  noteIds: string[];
  bytes: number;
  savedAt: number;
}

/** Notes whose PDFs nobody needs any more once `removedKey` is gone. Pure. */
export function orphanedNoteIds(removed: OfflineSetlist, remaining: OfflineSetlist[]): string[] {
  const stillUsed = new Set(remaining.filter((s) => s.key !== removed.key).flatMap((s) => s.noteIds));
  return [...new Set(removed.noteIds)].filter((id) => !stillUsed.has(id));
}

/** Matches a request path against a stored setlist (the fallback ignores the /api prefix and query). */
export function setlistForPath(pathname: string, setlists: OfflineSetlist[]): OfflineSetlist | undefined {
  return setlists.find((s) => pathname === s.apiPath || pathname.endsWith(s.apiPath));
}

export async function getOfflinePdf(noteId: string): Promise<OfflinePdf | undefined> {
  return (await (await getOfflineDb()).get(PDFS, noteId)) as OfflinePdf | undefined;
}

export async function putOfflinePdf(noteId: string, blob: Blob): Promise<void> {
  const record: OfflinePdf = { noteId, blob, bytes: blob.size, savedAt: Date.now() };
  await (await getOfflineDb()).put(PDFS, record);
}

/**
 * Called after a new PDF was uploaded for a note: an existing offline copy is
 * replaced with the new version so saved setlists stay complete. If the
 * re-download fails, the stale copy is dropped rather than played.
 */
export async function refreshOfflinePdfIfSaved(noteId: string, download: (noteId: string) => Promise<Blob>): Promise<void> {
  if (!(await getOfflinePdf(noteId))) return;
  try {
    await putOfflinePdf(noteId, await download(noteId));
  } catch {
    await (await getOfflineDb()).delete(PDFS, noteId);
  }
}

export async function getOfflineSetlists(): Promise<OfflineSetlist[]> {
  const all = (await (await getOfflineDb()).getAll(SETLISTS)) as OfflineSetlist[];
  return all.sort((a, b) => b.savedAt - a.savedAt);
}

export async function getOfflineSetlist(key: string): Promise<OfflineSetlist | undefined> {
  return (await (await getOfflineDb()).get(SETLISTS, key)) as OfflineSetlist | undefined;
}

export interface SaveSetlistInput {
  key: string;
  title: string;
  apiPath: string;
  response: unknown;
  noteIds: string[];
}

/**
 * Downloads every PDF of a setlist and stores it together with the setlist.
 * The setlist record is written last, so an aborted download never leaves a
 * setlist that claims to be available offline but misses PDFs.
 */
export async function saveSetlistOffline(
  input: SaveSetlistInput,
  download: (noteId: string) => Promise<Blob>,
  onProgress?: (done: number, total: number) => void,
): Promise<OfflineSetlist> {
  const noteIds = [...new Set(input.noteIds)];
  // Ask the browser not to evict our data under storage pressure (best effort).
  void navigator.storage?.persist?.().catch(() => undefined);
  let bytes = 0;
  onProgress?.(0, noteIds.length);
  for (let i = 0; i < noteIds.length; i++) {
    const blob = await download(noteIds[i]);
    await putOfflinePdf(noteIds[i], blob);
    bytes += blob.size;
    onProgress?.(i + 1, noteIds.length);
  }
  const record: OfflineSetlist = { ...input, noteIds, bytes, savedAt: Date.now() };
  await (await getOfflineDb()).put(SETLISTS, record);
  return record;
}

export async function removeSetlistOffline(key: string): Promise<void> {
  const db = await getOfflineDb();
  const all = (await db.getAll(SETLISTS)) as OfflineSetlist[];
  const removed = all.find((s) => s.key === key);
  if (!removed) return;
  const orphans = orphanedNoteIds(removed, all);
  const tx = db.transaction([SETLISTS, PDFS], "readwrite");
  await Promise.all([tx.objectStore(SETLISTS).delete(key), ...orphans.map((id) => tx.objectStore(PDFS).delete(id))]);
  await tx.done;
}

/** Replays a stored setlist response for the $api offline fallback. */
export async function offlineSetlistResponse(pathname: string): Promise<unknown | undefined> {
  return setlistForPath(pathname, await getOfflineSetlists())?.response;
}

/** Route of the play mode for a stored setlist key ("event:club:event" → "/play/event/club/event"). Pure. */
export function playPathForKey(key: string): string | undefined {
  const [kind, ...ids] = key.split(":");
  if ((kind === "note" || kind === "concert") && ids.length === 1 && ids[0]) return `/play/${kind}/${ids[0]}`;
  if (kind === "event" && ids.length === 2 && ids[0] && ids[1]) return `/play/event/${ids[0]}/${ids[1]}`;
  return undefined;
}
