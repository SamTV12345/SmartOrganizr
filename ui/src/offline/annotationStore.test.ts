import { describe, it, expect, beforeEach } from "vitest";
import { clearOfflineData } from "./offlineDb";
import { countPendingAnnotations, flushPendingAnnotations, loadAnnotations, saveAnnotationPage } from "./annotationStore";

const offline = async () => { throw new Error("offline"); };

describe("annotationStore", () => {
  beforeEach(async () => { await clearOfflineData(); });

  it("loads from the server and caches for offline use", async () => {
    const pages = await loadAnnotations("n1", async () => [{ page: 1, data: "A" }, { page: 3, data: "C" }]);
    expect(pages).toEqual({ 1: "A", 3: "C" });
    expect(await loadAnnotations("n1", offline)).toEqual({ 1: "A", 3: "C" });
  });

  it("queues edits made offline and shows them on reload", async () => {
    expect(await saveAnnotationPage("n1", 2, "B", offline)).toBe(false);
    expect(await countPendingAnnotations()).toBe(1);
    expect(await loadAnnotations("n1", offline)).toEqual({ 2: "B" });
    // Even when the server answers with an older state, the local edit wins until sent.
    expect(await loadAnnotations("n1", async () => [{ page: 2, data: "old" }])).toEqual({ 2: "B" });
  });

  it("flushes queued edits once the server is reachable again", async () => {
    await saveAnnotationPage("n1", 1, "A", offline);
    await saveAnnotationPage("n2", 4, "D", offline);
    const sent: string[] = [];
    expect(await flushPendingAnnotations(async (key, page, data) => { sent.push(`${key}/${page}=${data}`); })).toBe(2);
    expect(sent).toEqual(["n1/1=A", "n2/4=D"]);
    expect(await countPendingAnnotations()).toBe(0);
  });

  it("keeps the queue when flushing fails", async () => {
    await saveAnnotationPage("n1", 1, "A", offline);
    expect(await flushPendingAnnotations(offline)).toBe(0);
    expect(await countPendingAnnotations()).toBe(1);
  });

  it("a confirmed save clears an older queued edit of the same page", async () => {
    await saveAnnotationPage("n1", 1, "offline edit", offline);
    expect(await saveAnnotationPage("n1", 1, "online edit", async () => undefined)).toBe(true);
    expect(await countPendingAnnotations()).toBe(0);
    expect(await loadAnnotations("n1", offline)).toEqual({ 1: "online edit" });
  });
});
