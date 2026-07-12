import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/src/api/client", () => ({ http: { post: vi.fn() } }));
vi.mock("@/src/Keycloak", () => ({ apiURL: "http://api" }));

import { http } from "@/src/api/client";
import { pushPendingSweeps } from "./pendingSweepSync";
import {
  addPendingSighting, clearPendingSweeps, completePendingSweep, createPendingSweep, getPendingSweeps,
} from "./pendingSweeps";
import type { SweepReport } from "@/src/api/types";

const mockedPost = http.post as unknown as ReturnType<typeof vi.fn>;

const report: SweepReport = { present: [{ noteId: "n1", name: "Armenian Dances" }], newHere: [], missing: [], incomplete: [] };

function mockServer(): void {
  mockedPost.mockImplementation((url: string) => {
    if (url === "http://api/v1/inventory/sweeps") return Promise.resolve({ data: { sweepId: "srv-1" } });
    if (url.endsWith("/sightings")) return Promise.resolve({ data: { alreadySighted: false, inventoryNo: 421 } });
    if (url.endsWith("/complete")) return Promise.resolve({ data: report });
    return Promise.reject(new Error(`unexpected POST ${url}`));
  });
}

describe("pushPendingSweeps", () => {
  beforeEach(async () => {
    await clearPendingSweeps();
    mockedPost.mockReset();
  });

  it("replays a completed sweep (create → sightings → complete) and deletes it", async () => {
    mockServer();
    const sweep = await createPendingSweep("f1", "Mappe Flöte");
    await addPendingSighting(sweep.id, { noteId: "n1", name: "Armenian Dances", matchedVia: "OCR", confidence: 100, incomplete: false });
    await addPendingSighting(sweep.id, { noteId: "n2", name: "Böhmischer Traum", matchedVia: "MANUAL", incomplete: true });
    await completePendingSweep(sweep.id);

    const result = await pushPendingSweeps();

    expect(result.failed).toBe(0);
    expect(result.pushed).toEqual([
      { sweepId: "srv-1", folderId: "f1", folderName: "Mappe Flöte", report },
    ]);
    expect(mockedPost.mock.calls.map((c) => c[0])).toEqual([
      "http://api/v1/inventory/sweeps",
      "http://api/v1/inventory/sweeps/srv-1/sightings",
      "http://api/v1/inventory/sweeps/srv-1/sightings",
      "http://api/v1/inventory/sweeps/srv-1/complete",
    ]);
    expect(mockedPost.mock.calls[0][1]).toEqual({ folderId: "f1" });
    expect(mockedPost.mock.calls[1][1]).toEqual({ noteId: "n1", matchedVia: "OCR", confidence: 100, incomplete: false });
    expect(mockedPost.mock.calls[2][1]).toEqual({ noteId: "n2", matchedVia: "MANUAL", confidence: undefined, incomplete: true });
    // Synced sweep is gone from the queue.
    expect(await getPendingSweeps()).toEqual([]);
  });

  it("keeps the sweep queued when the push fails, and pushes it on retry", async () => {
    mockedPost.mockRejectedValue(new Error("network down"));
    const sweep = await createPendingSweep("f1", "Mappe Flöte");
    await completePendingSweep(sweep.id);

    const failedResult = await pushPendingSweeps();
    expect(failedResult).toEqual({ pushed: [], failed: 1 });
    expect((await getPendingSweeps()).map((s) => s.id)).toEqual([sweep.id]);

    mockedPost.mockReset();
    mockServer();
    const retry = await pushPendingSweeps();
    expect(retry.failed).toBe(0);
    expect(retry.pushed).toHaveLength(1);
    expect(await getPendingSweeps()).toEqual([]);
  });

  it("a failing sweep does not block the others", async () => {
    const bad = await createPendingSweep("f-bad", "Bad");
    await completePendingSweep(bad.id);
    const good = await createPendingSweep("f-good", "Good");
    await completePendingSweep(good.id);

    mockedPost.mockImplementation((url: string, body?: unknown) => {
      if (url === "http://api/v1/inventory/sweeps") {
        const folderId = (body as { folderId: string }).folderId;
        if (folderId === "f-bad") return Promise.reject(new Error("403"));
        return Promise.resolve({ data: { sweepId: "srv-good" } });
      }
      if (url.endsWith("/complete")) return Promise.resolve({ data: report });
      return Promise.resolve({ data: {} });
    });

    const result = await pushPendingSweeps();
    expect(result.failed).toBe(1);
    expect(result.pushed.map((p) => p.folderId)).toEqual(["f-good"]);
    expect((await getPendingSweeps()).map((s) => s.id)).toEqual([bad.id]);
  });

  it("does not push sweeps that are still in progress", async () => {
    mockServer();
    await createPendingSweep("f1", "Mappe Flöte"); // never completed
    const result = await pushPendingSweeps();
    expect(result).toEqual({ pushed: [], failed: 0 });
    expect(mockedPost).not.toHaveBeenCalled();
    expect(await getPendingSweeps()).toHaveLength(1);
  });
});
