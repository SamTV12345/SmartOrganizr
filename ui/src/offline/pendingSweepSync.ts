import { useSyncExternalStore } from "react";
import { http } from "@/src/api/client";
import { apiURL } from "@/src/Keycloak";
import type { SweepReport } from "@/src/api/types";
import { getOfflineBoot } from "./useOnlineStatus";
import { countCompletedPendingSweeps, deletePendingSweep, getCompletedPendingSweeps } from "./pendingSweeps";

/**
 * Pushes offline-captured inventory sweeps to the backend once connectivity returns
 * (window "online" event, or as part of runSync). Each pending sweep is replayed as a
 * real sweep session; the server-computed diff report is collected so InventoryView
 * can show it after the fact.
 */

export type PushedSweepReport = {
  sweepId: string;
  folderId: string;
  folderName: string;
  report: SweepReport;
};

export type PushResult = { pushed: PushedSweepReport[]; failed: number };

/**
 * Replay all locally completed sweeps against the API. A sweep is deleted only after
 * the whole replay (create → sightings → complete) succeeded; on failure it stays
 * queued for the next attempt. Never throws.
 */
export async function pushPendingSweeps(): Promise<PushResult> {
  const pending = await getCompletedPendingSweeps();
  const pushed: PushedSweepReport[] = [];
  let failed = 0;
  for (const sweep of pending) {
    try {
      const created = (await http.post(`${apiURL}/v1/inventory/sweeps`, { folderId: sweep.folderId }))
        .data as { sweepId: string };
      for (const sighting of sweep.sightings) {
        await http.post(`${apiURL}/v1/inventory/sweeps/${created.sweepId}/sightings`, {
          noteId: sighting.noteId,
          matchedVia: sighting.matchedVia,
          confidence: sighting.confidence,
          incomplete: sighting.incomplete,
        });
      }
      const report = (await http.post(`${apiURL}/v1/inventory/sweeps/${created.sweepId}/complete`, {}))
        .data as SweepReport;
      await deletePendingSweep(sweep.id);
      pushed.push({ sweepId: created.sweepId, folderId: sweep.folderId, folderName: sweep.folderName, report });
    } catch {
      failed++;
    }
  }
  return { pushed, failed };
}

/* ------------------------- reactive store ------------------------- */

export type PendingSweepSyncState = {
  /** Locally completed sweeps still waiting to be pushed. */
  pendingCount: number;
  /** Reports returned by the last successful push; null once dismissed. */
  syncedReports: PushedSweepReport[] | null;
  pushing: boolean;
};

let state: PendingSweepSyncState = { pendingCount: 0, syncedReports: null, pushing: false };
const listeners = new Set<() => void>();

function setState(patch: Partial<PendingSweepSyncState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

let hydrated = false;
function hydratePendingCount(): void {
  if (hydrated) return;
  hydrated = true;
  void refreshPendingCount();
}

/** Re-read the pending count from IndexedDB (call after local sweeps change). */
export async function refreshPendingCount(): Promise<void> {
  try {
    setState({ pendingCount: await countCompletedPendingSweeps() });
  } catch {
    // IndexedDB unavailable — leave the count as-is.
  }
}

export function dismissSyncedReports(): void {
  setState({ syncedReports: null });
}

/** Reactive pending-sweep sync status for the inventory screen. */
export function usePendingSweepSync(): PendingSweepSyncState {
  hydratePendingCount();
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/**
 * Push pending sweeps and publish the result to the store. Skipped while another push
 * runs, while offline, or after an offline boot (no Keycloak session to authenticate
 * the requests). Never throws; returns whether every queued sweep was pushed.
 */
export async function pushPendingSweepsNow(): Promise<boolean> {
  if (state.pushing || getOfflineBoot()) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  setState({ pushing: true });
  try {
    const result = await pushPendingSweeps();
    setState({
      pushing: false,
      pendingCount: await countCompletedPendingSweeps(),
      ...(result.pushed.length > 0
        ? { syncedReports: [...(state.syncedReports ?? []), ...result.pushed] }
        : {}),
    });
    return result.failed === 0;
  } catch {
    setState({ pushing: false });
    return false;
  }
}

// Sync-on-reconnect: same event the online-status hook uses. Registered once at module
// load (the module is pulled in by the sync store, which the app boot imports).
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void pushPendingSweepsNow();
  });
}
