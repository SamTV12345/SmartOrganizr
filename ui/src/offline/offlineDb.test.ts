import { describe, it, expect, beforeEach } from "vitest";
import {
  replaceAll, replaceAllStores, getAllAuthors, getAllFolders, getAllNotes, getRootFolders, getChildren,
  searchAuthors, searchNotes, getNoteDetail, setLastSyncedAt, getLastSyncedAt, clearOfflineData,
} from "./offlineDb";
import type { Author, Folder, Note } from "@/src/api/types";

const folder = (id: string, parentId?: string): Folder =>
  ({ id, name: `f-${id}`, type: "folder", parent: parentId ? ({ id: parentId } as Folder) : undefined } as Folder);
const note = (id: string, parentId?: string, name = `n-${id}`): Note =>
  ({ id, name, type: "note", parent: parentId ? ({ id: parentId } as Folder) : undefined } as Note);

describe("offlineDb", () => {
  beforeEach(async () => { await clearOfflineData(); });

  it("replaceAll then getAll round-trips authors", async () => {
    await replaceAll("authors", [{ id: "1", name: "Bach" } as Author]);
    expect((await getAllAuthors()).map((a) => a.id)).toEqual(["1"]);
  });

  it("replaceAll clears previous contents", async () => {
    await replaceAll("folders", [folder("a"), folder("b")]);
    await replaceAll("folders", [folder("c")]);
    expect((await getAllFolders()).map((f) => f.id)).toEqual(["c"]);
  });

  it("replaceAllStores replaces all three stores in one transaction", async () => {
    await replaceAll("authors", [{ id: "old", name: "Old" } as Author]);
    await replaceAllStores(
      [{ id: "1", name: "Bach" } as Author],
      [folder("a")],
      [note("n1", "a")],
    );
    expect((await getAllAuthors()).map((a) => a.id)).toEqual(["1"]);
    expect((await getAllFolders()).map((f) => f.id)).toEqual(["a"]);
    expect((await getAllNotes()).map((n) => n.id)).toEqual(["n1"]);
  });

  it("getRootFolders returns parentless folders", async () => {
    await replaceAll("folders", [folder("a"), folder("b", "a")]);
    expect((await getRootFolders()).map((f) => f.id)).toEqual(["a"]);
  });

  it("getChildren returns folders + notes of a parent", async () => {
    await replaceAll("folders", [folder("a"), folder("b", "a")]);
    await replaceAll("notes", [note("n1", "a"), note("n2", "x")]);
    expect((await getChildren("a")).map((e) => e.id).sort()).toEqual(["b", "n1"]);
  });

  it("searchAuthors / searchNotes filter by name", async () => {
    await replaceAll("authors", [{ id: "1", name: "Bach" } as Author, { id: "2", name: "Mozart" } as Author]);
    await replaceAll("notes", [note("1", "a", "Toccata"), note("2", "a", "Fugue")]);
    expect((await searchAuthors("moz")).map((a) => a.id)).toEqual(["2"]);
    expect((await searchNotes("fug")).map((n) => n.id)).toEqual(["2"]);
  });

  it("getNoteDetail computes neighbors", async () => {
    await replaceAll("notes", [note("1", "a", "Aaa"), note("2", "a", "Bbb"), note("3", "a", "Ccc")]);
    const d = await getNoteDetail("2");
    expect(d.previousNote?.id).toBe("1");
    expect(d.nextNote?.id).toBe("3");
  });

  it("stores and reads lastSyncedAt", async () => {
    await setLastSyncedAt(1234);
    expect(await getLastSyncedAt()).toBe(1234);
  });
});
