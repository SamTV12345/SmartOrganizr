import { getOfflineDb } from "./offlineDb";

/**
 * Queue of inventory sweeps captured while offline. Each entry mirrors one server
 * sweep session; on reconnect the sync layer replays it against the API
 * (POST sweep → POST sightings → POST complete) and deletes it on success.
 */

const STORE = "pendingSweeps";

export type PendingSighting = {
  noteId: string;
  name: string;
  matchedVia: "OCR" | "MANUAL";
  confidence?: number;
  incomplete: boolean;
};

export type PendingSweep = {
  id: string;
  folderId: string;
  folderName: string;
  startedAt: number;
  /** Set when the user tapped "Fertig" — only completed sweeps are pushed on sync. */
  completedAt?: number;
  sightings: PendingSighting[];
};

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

/** Open a new local sweep session for a folder. */
export async function createPendingSweep(folderId: string, folderName: string): Promise<PendingSweep> {
  const sweep: PendingSweep = { id: generateId(), folderId, folderName, startedAt: Date.now(), sightings: [] };
  await (await getOfflineDb()).put(STORE, sweep);
  return sweep;
}

/** All pending sweeps, oldest first (push order). */
export async function getPendingSweeps(): Promise<PendingSweep[]> {
  const all = (await (await getOfflineDb()).getAll(STORE)) as PendingSweep[];
  return all.sort((a, b) => a.startedAt - b.startedAt);
}

export async function getPendingSweep(id: string): Promise<PendingSweep | undefined> {
  return (await (await getOfflineDb()).get(STORE, id)) as PendingSweep | undefined;
}

/** Sweeps completed locally and awaiting sync. */
export async function getCompletedPendingSweeps(): Promise<PendingSweep[]> {
  return (await getPendingSweeps()).filter((s) => s.completedAt !== undefined);
}

export async function countCompletedPendingSweeps(): Promise<number> {
  return (await getCompletedPendingSweeps()).length;
}

/**
 * Record a sighting on a local sweep. Same note twice is a no-op, mirroring the
 * server's idempotent sighting endpoint ("schon erfasst").
 */
export async function addPendingSighting(
  sweepId: string,
  sighting: PendingSighting,
): Promise<{ alreadySighted: boolean }> {
  const db = await getOfflineDb();
  const tx = db.transaction(STORE, "readwrite");
  const sweep = (await tx.store.get(sweepId)) as PendingSweep | undefined;
  if (!sweep) {
    await tx.done;
    throw new Error(`pending sweep not found: ${sweepId}`);
  }
  const alreadySighted = sweep.sightings.some((s) => s.noteId === sighting.noteId);
  if (!alreadySighted) {
    sweep.sightings.push(sighting);
    await tx.store.put(sweep);
  }
  await tx.done;
  return { alreadySighted };
}

/** Mark a local sweep as finished — it becomes eligible for the sync push. */
export async function completePendingSweep(id: string): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction(STORE, "readwrite");
  const sweep = (await tx.store.get(id)) as PendingSweep | undefined;
  if (sweep && sweep.completedAt === undefined) {
    sweep.completedAt = Date.now();
    await tx.store.put(sweep);
  }
  await tx.done;
}

export async function deletePendingSweep(id: string): Promise<void> {
  await (await getOfflineDb()).delete(STORE, id);
}

/**
 * Drop abandoned (never completed) local sweeps for a folder — called when a new
 * offline sweep starts so stale half-sessions don't pile up.
 */
export async function deleteIncompletePendingSweepsForFolder(folderId: string): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction(STORE, "readwrite");
  const all = (await tx.store.getAll()) as PendingSweep[];
  for (const sweep of all) {
    if (sweep.folderId === folderId && sweep.completedAt === undefined) {
      await tx.store.delete(sweep.id);
    }
  }
  await tx.done;
}

/** Test/utility helper. */
export async function clearPendingSweeps(): Promise<void> {
  await (await getOfflineDb()).clear(STORE);
}
