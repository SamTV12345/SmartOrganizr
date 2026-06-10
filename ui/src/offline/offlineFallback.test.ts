import { describe, it, expect, beforeEach } from "vitest";
import { buildOfflineApiResponse, buildOfflineHttpResponse } from "./offlineFallback";
import { replaceAll, clearOfflineData } from "./offlineDb";
import type { Author, Folder, Note } from "@/src/api/types";

const folder = (id: string, parentId?: string): Folder =>
  ({ id, name: `f-${id}`, type: "folder", parent: parentId ? ({ id: parentId } as Folder) : undefined } as Folder);
const note = (id: string, parentId?: string, name = `n-${id}`): Note =>
  ({ id, name, type: "note", parent: parentId ? ({ id: parentId } as Folder) : undefined } as Note);

describe("buildOfflineApiResponse", () => {
  beforeEach(async () => {
    await clearOfflineData();
    await replaceAll("authors", [{ id: "1", name: "Bach" } as Author, { id: "2", name: "Mozart" } as Author]);
    await replaceAll("folders", [folder("a"), folder("b", "a")]);
    await replaceAll("notes", [note("n1", "a", "Aaa"), note("n2", "a", "Bbb")]);
  });

  it("serves filtered authors as a page", async () => {
    const res = await buildOfflineApiResponse(new URL("http://x/api/v1/authors?name=bach"));
    const body = await res!.json();
    expect(body._embedded.authorRepresentationModelList.map((a: Author) => a.id)).toEqual(["1"]);
  });

  it("serves root folders", async () => {
    const res = await buildOfflineApiResponse(new URL("http://x/api/v1/elements/parentDecks"));
    expect((await res!.json()).map((f: Folder) => f.id)).toEqual(["a"]);
  });

  it("serves note detail", async () => {
    const res = await buildOfflineApiResponse(new URL("http://x/api/v1/elements/notes/n2"));
    expect((await res!.json()).currentNote.id).toBe("n2");
  });

  it("returns undefined for unknown paths", async () => {
    expect(await buildOfflineApiResponse(new URL("http://x/api/v1/unknown"))).toBeUndefined();
  });
});

describe("buildOfflineHttpResponse", () => {
  beforeEach(async () => {
    await clearOfflineData();
    await replaceAll("folders", [folder("a"), folder("b", "a")]);
    await replaceAll("notes", [note("n1", "a", "Toccata"), note("n2", "a", "Fugue")]);
  });

  it("serves folder children", async () => {
    const res = await buildOfflineHttpResponse("http://x/api/v1/elements/a/children");
    expect((res!.data as Array<{ id: string }>).map((e) => e.id).sort()).toEqual(["b", "n1", "n2"]);
  });

  it("serves filtered notes as a page", async () => {
    const res = await buildOfflineHttpResponse("http://x/api/v1/elements/notes?noteName=fug");
    const data = res!.data as { _embedded: { noteRepresentationModelList: Array<{ id: string }> } };
    expect(data._embedded.noteRepresentationModelList.map((n) => n.id)).toEqual(["n2"]);
  });

  it("returns undefined for unknown paths", async () => {
    expect(await buildOfflineHttpResponse("http://x/api/v1/unknown")).toBeUndefined();
  });
});
