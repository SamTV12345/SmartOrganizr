import { describe, it, expect } from "vitest";
import {
  selectRootFolders, selectChildren, filterAuthorsByName, filterNotesByName, selectNoteDetail,
} from "./offlineQueries";
import type { Author, Folder, Note } from "@/src/api/types";

const folder = (id: string, parentId?: string): Folder =>
  ({ id, name: `f-${id}`, type: "folder", parent: parentId ? ({ id: parentId } as Folder) : undefined } as Folder);
const note = (id: string, parentId?: string, name = `n-${id}`): Note =>
  ({ id, name, type: "note", parent: parentId ? ({ id: parentId } as Folder) : undefined } as Note);
const author = (id: string, name: string): Author => ({ id, name } as Author);

describe("selectRootFolders", () => {
  it("returns only folders with no parent", () => {
    expect(selectRootFolders([folder("a"), folder("b", "a"), folder("c")]).map((f) => f.id).sort())
      .toEqual(["a", "c"]);
  });
});

describe("selectChildren", () => {
  it("returns folders and notes whose parent matches", () => {
    const folders = [folder("a"), folder("b", "a"), folder("c", "x")];
    const notes = [note("n1", "a"), note("n2", "x")];
    expect(selectChildren("a", folders, notes).map((e) => e.id).sort()).toEqual(["b", "n1"]);
  });
});

describe("filterAuthorsByName", () => {
  const authors = [author("1", "Johann Sebastian Bach"), author("2", "Mozart")];
  it("matches case-insensitive substring", () => {
    expect(filterAuthorsByName(authors, "bach").map((a) => a.id)).toEqual(["1"]);
  });
  it("returns all for empty query", () => {
    expect(filterAuthorsByName(authors, "  ").length).toBe(2);
  });
});

describe("filterNotesByName", () => {
  it("matches case-insensitive substring", () => {
    const notes = [note("1", "a", "Toccata"), note("2", "a", "Fugue")];
    expect(filterNotesByName(notes, "fug").map((n) => n.id)).toEqual(["2"]);
  });
});

describe("selectNoteDetail", () => {
  const notes = [note("1", "a", "Aaa"), note("2", "a", "Bbb"), note("3", "a", "Ccc"), note("9", "x", "Zzz")];
  it("computes neighbors within the same parent, ordered by name", () => {
    const d = selectNoteDetail("2", notes);
    expect(d.currentNote?.id).toBe("2");
    expect(d.previousNote?.id).toBe("1");
    expect(d.nextNote?.id).toBe("3");
    expect(d.index).toBe(1);
  });
  it("returns undefined currentNote when not found", () => {
    expect(selectNoteDetail("missing", notes).currentNote).toBeUndefined();
  });
});
