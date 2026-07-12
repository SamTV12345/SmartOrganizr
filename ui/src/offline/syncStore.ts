import { useSyncExternalStore } from "react";
import { syncNow } from "./offlineSync";
import { getLastSyncedAt } from "./offlineDb";

export type SyncStatus = {
  syncing: boolean;
  lastSyncedAt: number | null;
  lastError: string | null;
};

let state: SyncStatus = { syncing: false, lastSyncedAt: null, lastError: null };
const listeners = new Set<() => void>();

function setState(patch: Partial<SyncStatus>): void {
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
function hydrateLastSynced(): void {
  if (hydrated) return;
  hydrated = true;
  getLastSyncedAt()
    .then((ts) => {
      if (ts !== undefined && state.lastSyncedAt === null) setState({ lastSyncedAt: ts });
    })
    .catch(() => {
      // IndexedDB unavailable — the UI just shows "never synced".
    });
}

/** Reactive sync status (last synced, in-flight, last failure). */
export function useSyncStatus(): SyncStatus {
  hydrateLastSynced();
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function dismissSyncError(): void {
  setState({ lastError: null });
}

/**
 * Run a full offline sync, recording progress and failure so the UI (profile card,
 * failure toast) can react. Never throws; returns whether the sync succeeded.
 */
export async function runSync(): Promise<boolean> {
  if (state.syncing) return true;
  setState({ syncing: true, lastError: null });
  try {
    await syncNow();
    setState({ syncing: false, lastSyncedAt: Date.now() });
    return true;
  } catch (error) {
    setState({ syncing: false, lastError: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
