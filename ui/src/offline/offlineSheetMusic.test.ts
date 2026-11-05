import { describe, it, expect, beforeEach } from "vitest";
import { clearOfflineData } from "./offlineDb";
import {
  getOfflinePdf,
  getOfflineSetlists,
  orphanedNoteIds,
  playPathForKey,
  refreshOfflinePdfIfSaved,
  removeSetlistOffline,
  saveSetlistOffline,
  setlistForPath,
  type OfflineSetlist,
} from "./offlineSheetMusic";
import { buildOfflineApiResponse } from "./offlineFallback";

const setlist = (key: string, noteIds: string[], apiPath = `/v1/x/${key}`): OfflineSetlist =>
  ({ key, title: key, apiPath, response: null, noteIds, bytes: 0, savedAt: 0 });

const pdf = (text: string) => new Blob([`%PDF ${text}`], { type: "application/pdf" });

describe("offlineSheetMusic pure helpers", () => {
  it("drops only PDFs no other setlist needs", () => {
    const a = setlist("a", ["n1", "n2", "n2"]);
    const b = setlist("b", ["n2", "n3"]);
    expect(orphanedNoteIds(a, [a, b])).toEqual(["n1"]);
    expect(orphanedNoteIds(b, [b])).toEqual(["n2", "n3"]);
  });

  it("matches request paths with or without the /api prefix", () => {
    const s = setlist("c", [], "/v1/concerts/c1");
    expect(setlistForPath("/api/v1/concerts/c1", [s])).toBe(s);
    expect(setlistForPath("/v1/concerts/c1", [s])).toBe(s);
    expect(setlistForPath("/api/v1/concerts/c2", [s])).toBeUndefined();
  });

  it("maps setlist keys back to play routes", () => {
    expect(playPathForKey("event:club-1:ev-1")).toBe("/play/event/club-1/ev-1");
    expect(playPathForKey("concert:c1")).toBe("/play/concert/c1");
    expect(playPathForKey("note:n1")).toBe("/play/note/n1");
    expect(playPathForKey("event:only-one")).toBeUndefined();
    expect(playPathForKey("bogus:x")).toBeUndefined();
  });
});

describe("offlineSheetMusic storage", () => {
  beforeEach(async () => { await clearOfflineData(); });

  it("saves all PDFs of a setlist and reports progress", async () => {
    const progress: string[] = [];
    const saved = await saveSetlistOffline(
      { key: "concert:c1", title: "Sommerkonzert", apiPath: "/v1/concerts/c1", response: { title: "Sommerkonzert" }, noteIds: ["n1", "n2", "n1"] },
      async (id) => pdf(id),
      (done, total) => progress.push(`${done}/${total}`),
    );
    expect(progress).toEqual(["0/2", "1/2", "2/2"]);
    expect(saved.noteIds).toEqual(["n1", "n2"]);
    expect(saved.bytes).toBe(pdf("n1").size + pdf("n2").size);
    expect((await getOfflinePdf("n2"))?.bytes).toBe(pdf("n2").size);
    expect((await getOfflineSetlists()).map((s) => s.key)).toEqual(["concert:c1"]);
  });

  it("writes no setlist when a download fails", async () => {
    await expect(
      saveSetlistOffline(
        { key: "concert:c1", title: "", apiPath: "/v1/concerts/c1", response: {}, noteIds: ["ok", "broken"] },
        async (id) => { if (id === "broken") throw new Error("404"); return pdf(id); },
      ),
    ).rejects.toThrow("404");
    expect(await getOfflineSetlists()).toEqual([]);
  });

  it("keeps shared PDFs when one of two setlists is removed", async () => {
    const download = async (id: string) => pdf(id);
    await saveSetlistOffline({ key: "a", title: "", apiPath: "/a", response: {}, noteIds: ["n1", "shared"] }, download);
    await saveSetlistOffline({ key: "b", title: "", apiPath: "/b", response: {}, noteIds: ["shared"] }, download);
    await removeSetlistOffline("a");
    expect(await getOfflinePdf("n1")).toBeUndefined();
    expect(await getOfflinePdf("shared")).toBeDefined();
    expect((await getOfflineSetlists()).map((s) => s.key)).toEqual(["b"]);
  });

  it("refreshes a saved PDF after a new upload, and leaves unsaved notes alone", async () => {
    await saveSetlistOffline({ key: "a", title: "", apiPath: "/a", response: {}, noteIds: ["n1"] }, async () => pdf("old"));
    await refreshOfflinePdfIfSaved("n1", async () => pdf("new version"));
    expect((await getOfflinePdf("n1"))?.bytes).toBe(pdf("new version").size);
    await refreshOfflinePdfIfSaved("n2", async () => pdf("x"));
    expect(await getOfflinePdf("n2")).toBeUndefined();
  });

  it("drops a saved PDF whose refresh fails instead of playing a stale copy", async () => {
    await saveSetlistOffline({ key: "a", title: "", apiPath: "/a", response: {}, noteIds: ["n1"] }, async () => pdf("old"));
    await refreshOfflinePdfIfSaved("n1", async () => { throw new Error("offline"); });
    expect(await getOfflinePdf("n1")).toBeUndefined();
  });

  it("replays a saved setlist through the $api offline fallback", async () => {
    const response = [{ entryId: "e1", title: "Abel Tasman", noteId: "n1", pdfAvailable: true, match: "own" }];
    const apiPath = "/v1/clubs/c/events/e/program/playlist";
    await saveSetlistOffline({ key: "event:c:e", title: "Probe", apiPath, response, noteIds: ["n1"] }, async () => pdf("n1"));
    const res = await buildOfflineApiResponse(new URL(`http://localhost/api${apiPath}`));
    expect(res?.status).toBe(200);
    expect(await res?.json()).toEqual(response);
  });
});
