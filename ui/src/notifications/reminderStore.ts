import { useSyncExternalStore } from "react";

// In-app reminder ("please answer event X") pushed over the notification stream.
// Kept outside React so the SSE handler can raise it and the toast can render it.

export type EventReminder = { clubId: string; eventId: string; summary: string };

let current: EventReminder | null = null;
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

const emit = () => listeners.forEach((listener) => listener());

export function showEventReminder(reminder: EventReminder): void {
  current = reminder;
  emit();
}

export function dismissEventReminder(): void {
  current = null;
  emit();
}

export function useEventReminder(): EventReminder | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}
