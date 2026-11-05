import { getOfflineDb } from "./offlineDb";

// Annotations are stored on the server (so tablet and phone agree) and cached
// here, so they show up offline and edits made offline are not lost:
//  - annotations:        last known pages per PDF key { key, pages: { [page]: json } }
//  - pendingAnnotations: page edits the server has not confirmed yet
// The remote calls are injected, which keeps this module testable.

const CACHE = "annotations";
const PENDING = "pendingAnnotations";

export type AnnotationPages = Record<number, string>;
export type FetchRemote = (key: string) => Promise<{ page: number; data: string }[]>;
export type PutRemote = (key: string, page: number, data: string) => Promise<void>;

interface CacheRecord { key: string; pages: AnnotationPages }
interface PendingRecord { id: string; key: string; page: number; data: string; at: number }

const pendingId = (key: string, page: number) => `${key}|${page}`;

async function readCache(key: string): Promise<AnnotationPages> {
  const rec = (await (await getOfflineDb()).get(CACHE, key)) as CacheRecord | undefined;
  return rec?.pages ?? {};
}

async function writeCache(key: string, pages: AnnotationPages): Promise<void> {
  await (await getOfflineDb()).put(CACHE, { key, pages } satisfies CacheRecord);
}

async function pendingFor(key: string): Promise<PendingRecord[]> {
  const all = (await (await getOfflineDb()).getAll(PENDING)) as PendingRecord[];
  return all.filter((p) => p.key === key);
}

/** Pending local edits always win over what the server or cache says. */
function overlay(pages: AnnotationPages, pending: PendingRecord[]): AnnotationPages {
  const out = { ...pages };
  for (const p of pending) out[p.page] = p.data;
  return out;
}

/** Server first, cache as fallback; unconfirmed local edits on top. */
export async function loadAnnotations(key: string, fetchRemote: FetchRemote): Promise<AnnotationPages> {
  const pending = await pendingFor(key).catch(() => [] as PendingRecord[]);
  try {
    const remote = await fetchRemote(key);
    const pages: AnnotationPages = {};
    for (const r of remote) pages[r.page] = r.data;
    const merged = overlay(pages, pending);
    await writeCache(key, merged).catch(() => undefined);
    return merged;
  } catch {
    const cached = await readCache(key).catch(() => ({}) as AnnotationPages);
    return overlay(cached, pending);
  }
}

/**
 * Saves one page: cache immediately, then the server. If the server is not
 * reachable the edit is queued and sent later by flushPendingAnnotations.
 * Resolves to true when the server confirmed it.
 */
export async function saveAnnotationPage(key: string, page: number, data: string, putRemote: PutRemote): Promise<boolean> {
  const db = await getOfflineDb();
  const pages = await readCache(key);
  pages[page] = data;
  await writeCache(key, pages);
  try {
    await putRemote(key, page, data);
    await db.delete(PENDING, pendingId(key, page));
    return true;
  } catch {
    await db.put(PENDING, { id: pendingId(key, page), key, page, data, at: Date.now() } satisfies PendingRecord);
    return false;
  }
}

/** Sends queued offline edits, oldest first; stops at the first failure. Returns how many were sent. */
export async function flushPendingAnnotations(putRemote: PutRemote): Promise<number> {
  const db = await getOfflineDb();
  const all = ((await db.getAll(PENDING)) as PendingRecord[]).sort((a, b) => a.at - b.at);
  let sent = 0;
  for (const p of all) {
    try {
      await putRemote(p.key, p.page, p.data);
    } catch {
      break;
    }
    // Only drop it if no newer edit replaced it meanwhile.
    const current = (await db.get(PENDING, p.id)) as PendingRecord | undefined;
    if (current && current.at === p.at) await db.delete(PENDING, p.id);
    sent++;
  }
  return sent;
}

export async function countPendingAnnotations(): Promise<number> {
  return (await (await getOfflineDb()).count(PENDING));
}
