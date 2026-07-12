import { useSyncExternalStore } from "react";

let updateAvailable = false;
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/** Called from the service-worker registration when a new version has been installed. */
export function notifyAppUpdate(): void {
  updateAvailable = true;
  listeners.forEach((listener) => listener());
}

/** Reactive flag: a new app version is ready and a reload will pick it up. */
export function useAppUpdateAvailable(): boolean {
  return useSyncExternalStore(subscribe, () => updateAvailable, () => false);
}
