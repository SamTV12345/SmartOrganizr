import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/src/api/client", () => ({ apiFetch: { GET: vi.fn() } }));

import { apiFetch } from "@/src/api/client";
import { syncNow } from "./offlineSync";
import { getAllAuthors, getLastSyncedAt, clearOfflineData, replaceAll } from "./offlineDb";
import type { Author } from "@/src/api/types";

const mockedGet = apiFetch.GET as unknown as ReturnType<typeof vi.fn>;

describe("syncNow", () => {
  beforeEach(async () => { await clearOfflineData(); mockedGet.mockReset(); });

  it("replaces stores and stamps lastSyncedAt on success", async () => {
    mockedGet.mockResolvedValue({ data: { authors: [{ id: "1", name: "Bach" }], folders: [], notes: [] }, error: undefined });
    await syncNow();
    expect((await getAllAuthors()).map((a) => a.id)).toEqual(["1"]);
    expect(typeof (await getLastSyncedAt())).toBe("number");
  });

  it("throws and preserves data on malformed payload", async () => {
    await replaceAll("authors", [{ id: "old", name: "Old" } as Author]);
    mockedGet.mockResolvedValue({ data: { authors: "nope" }, error: undefined });
    await expect(syncNow()).rejects.toThrow();
    expect((await getAllAuthors()).map((a) => a.id)).toEqual(["old"]);
  });

  it("throws and preserves data on fetch error", async () => {
    await replaceAll("authors", [{ id: "old", name: "Old" } as Author]);
    mockedGet.mockResolvedValue({ data: undefined, error: { message: "network" } });
    await expect(syncNow()).rejects.toThrow();
    expect((await getAllAuthors()).map((a) => a.id)).toEqual(["old"]);
  });
});
