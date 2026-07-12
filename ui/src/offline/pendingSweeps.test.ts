import { describe, it, expect, beforeEach, vi } from "vitest";
import { openDB } from "idb";
import {
  createPendingSweep, getPendingSweeps, getPendingSweep, getCompletedPendingSweeps,
  countCompletedPendingSweeps, addPendingSighting, completePendingSweep, deletePendingSweep,
  deleteIncompletePendingSweepsForFolder, clearPendingSweeps,
} from "./pendingSweeps";
import { getAllAuthors } from "./offlineDb";

// This describe must run FIRST: it seeds a v1 database with the raw idb API before
// offlineDb opens its (lazy) connection, so the v1 → v2 upgrade path actually runs.
describe("offline DB v1 → v2 upgrade", () => {
  it("adds the pendingSweeps store and keeps existing data", async () => {
    const v1 = await openDB("smartorganizr-offline", 1, {
      upgrade(db) {
        for (const name of ["authors", "folders", "notes"]) db.createObjectStore(name, { keyPath: "id" });
        db.createObjectStore("meta");
      },
    });
    await v1.put("authors", { id: "keep", name: "Bach" });
    v1.close();

    // First module access opens the DB at version 2 and triggers the upgrade.
    const sweep = await createPendingSweep("f1", "Mappe Flöte");
    expect((await getPendingSweeps()).map((s) => s.id)).toEqual([sweep.id]);
    // v1 data survived the upgrade.
    expect((await getAllAuthors()).map((a) => a.id)).toEqual(["keep"]);
  });
});

describe("pendingSweeps CRUD", () => {
  beforeEach(async () => { await clearPendingSweeps(); });

  it("creates and reads back a pending sweep", async () => {
    const sweep = await createPendingSweep("f1", "Mappe Flöte");
    const stored = await getPendingSweep(sweep.id);
    expect(stored).toMatchObject({ folderId: "f1", folderName: "Mappe Flöte", sightings: [] });
    expect(typeof stored?.startedAt).toBe("number");
    expect(stored?.completedAt).toBeUndefined();
  });

  it("lists pending sweeps oldest first", async () => {
    // Strictly decreasing clock: the first sweep gets the larger startedAt even if
    // other code (fake-indexeddb) also reads Date.now in between.
    let tick = 1_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => tick--);
    const newer = await createPendingSweep("f1", "A");
    const older = await createPendingSweep("f2", "B");
    nowSpy.mockRestore();
    expect((await getPendingSweeps()).map((s) => s.id)).toEqual([older.id, newer.id]);
  });

  it("records sightings and is idempotent per note", async () => {
    const sweep = await createPendingSweep("f1", "A");
    const first = await addPendingSighting(sweep.id, {
      noteId: "n1", name: "Armenian Dances", matchedVia: "OCR", confidence: 100, incomplete: false,
    });
    expect(first.alreadySighted).toBe(false);
    const dup = await addPendingSighting(sweep.id, {
      noteId: "n1", name: "Armenian Dances", matchedVia: "MANUAL", incomplete: true,
    });
    expect(dup.alreadySighted).toBe(true);
    const stored = await getPendingSweep(sweep.id);
    expect(stored?.sightings).toEqual([
      { noteId: "n1", name: "Armenian Dances", matchedVia: "OCR", confidence: 100, incomplete: false },
    ]);
  });

  it("throws when adding a sighting to an unknown sweep", async () => {
    await expect(
      addPendingSighting("missing", { noteId: "n1", name: "x", matchedVia: "OCR", incomplete: false }),
    ).rejects.toThrow();
  });

  it("completePendingSweep marks the sweep; only completed sweeps count for sync", async () => {
    const sweep = await createPendingSweep("f1", "A");
    await createPendingSweep("f2", "B"); // stays in progress
    expect(await countCompletedPendingSweeps()).toBe(0);
    await completePendingSweep(sweep.id);
    const completed = await getCompletedPendingSweeps();
    expect(completed.map((s) => s.id)).toEqual([sweep.id]);
    expect(typeof completed[0].completedAt).toBe("number");
    expect(await countCompletedPendingSweeps()).toBe(1);
  });

  it("completePendingSweep keeps the original completion timestamp", async () => {
    const sweep = await createPendingSweep("f1", "A");
    await completePendingSweep(sweep.id);
    const firstTs = (await getPendingSweep(sweep.id))?.completedAt;
    await completePendingSweep(sweep.id);
    expect((await getPendingSweep(sweep.id))?.completedAt).toBe(firstTs);
  });

  it("deletePendingSweep removes the entry", async () => {
    const sweep = await createPendingSweep("f1", "A");
    await deletePendingSweep(sweep.id);
    expect(await getPendingSweep(sweep.id)).toBeUndefined();
    expect(await getPendingSweeps()).toEqual([]);
  });

  it("deleteIncompletePendingSweepsForFolder drops only abandoned sweeps of that folder", async () => {
    const abandoned = await createPendingSweep("f1", "A");
    const done = await createPendingSweep("f1", "A");
    await completePendingSweep(done.id);
    const otherFolder = await createPendingSweep("f2", "B");
    await deleteIncompletePendingSweepsForFolder("f1");
    const ids = (await getPendingSweeps()).map((s) => s.id).sort();
    expect(ids).toEqual([done.id, otherFolder.id].sort());
    expect(await getPendingSweep(abandoned.id)).toBeUndefined();
  });
});
