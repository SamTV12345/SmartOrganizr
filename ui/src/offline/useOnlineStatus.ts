import { useSyncExternalStore } from "react";

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
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
