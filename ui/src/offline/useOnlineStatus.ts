import { useSyncExternalStore } from "react";

// Set when the app booted without reaching the backend (offline boot path in index.tsx).
// Keycloak was never initialised in that case, so the session must stay in offline mode
// (read-only, banner visible) even if the radio reconnects — a reload is needed to log in.
let offlineBoot = false;
export function getOfflineBoot(): boolean { return offlineBoot; }
export function setOfflineBoot(value: boolean): void { offlineBoot = value; }

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** Reactive online/offline status. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine && !offlineBoot, () => true);
}
