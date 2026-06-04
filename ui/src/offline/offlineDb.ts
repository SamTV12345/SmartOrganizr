import { openDB, type IDBPDatabase } from "idb";
import type { Author, Folder, Note } from "@/src/api/types";
import type { NoteDetail } from "@/src/models/NoteDetail";
import {
  selectRootFolders, selectChildren, filterAuthorsByName, filterNotesByName, selectNoteDetail,
  type OfflineElement,
} from "./offlineQueries";

const DB_NAME = "smartorganizr-offline";
const DB_VERSION = 1;
const META_KEY_LAST_SYNCED = "lastSyncedAt";

type DataStore = "authors" | "folders" | "notes";
let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const name of ["authors", "folders", "notes"]) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      },
    });
  }
  return dbPromise;
}

export async function replaceAll<T>(store: DataStore, items: T[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(store, "readwrite");
  await tx.store.clear();
  for (const item of items) await tx.store.put(item);
  await tx.done;
}

export async function getAllAuthors(): Promise<Author[]> { return (await (await getDb()).getAll("authors")) as Author[]; }
export async function getAllFolders(): Promise<Folder[]> { return (await (await getDb()).getAll("folders")) as Folder[]; }
export async function getAllNotes(): Promise<Note[]> { return (await (await getDb()).getAll("notes")) as Note[]; }

export async function getRootFolders(): Promise<Folder[]> { return selectRootFolders(await getAllFolders()); }

export async function getChildren(folderId: string): Promise<OfflineElement[]> {
  const [folders, notes] = await Promise.all([getAllFolders(), getAllNotes()]);
  return selectChildren(folderId, folders, notes);
}

export async function searchAuthors(query: string): Promise<Author[]> { return filterAuthorsByName(await getAllAuthors(), query); }
export async function searchNotes(query: string): Promise<Note[]> { return filterNotesByName(await getAllNotes(), query); }
export async function getNoteDetail(noteId: string): Promise<NoteDetail> { return selectNoteDetail(noteId, await getAllNotes()); }

export async function setLastSyncedAt(ts: number): Promise<void> {
  await (await getDb()).put("meta", ts, META_KEY_LAST_SYNCED);
}
export async function getLastSyncedAt(): Promise<number | undefined> {
  return (await (await getDb()).get("meta", META_KEY_LAST_SYNCED)) as number | undefined;
}

/** Test/utility helper: wipe all data and meta. */
export async function clearOfflineData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["authors", "folders", "notes", "meta"], "readwrite");
  await Promise.all([
    tx.objectStore("authors").clear(),
    tx.objectStore("folders").clear(),
    tx.objectStore("notes").clear(),
    tx.objectStore("meta").clear(),
  ]);
  await tx.done;
}
