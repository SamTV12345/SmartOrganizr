# Offline PWA for iPhone — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the SmartOrganizr web UI an installable PWA that opens and works offline on iPhone — browse the folder tree, open note metadata, and search authors/notes from a locally-synced copy of the user's metadata.

**Architecture:** Frontend-only, plus one small backend fix. While online, the app pulls the existing `GET /v1/users/offline` bulk payload into IndexedDB (full-replace). While offline, a service worker serves the precached app shell, the boot sequence renders without Keycloak login, and a **centralized offline fallback in `ui/src/api/client.ts`** synthesizes API responses from IndexedDB for the read endpoints (so `$api` and `http`-shim call sites keep working unchanged). PDFs and writes are online-only.

**Tech Stack:** Go (Fiber, sqlc) backend; React 19 + Rsbuild + TypeScript frontend; `keycloak-js`; `@tanstack/react-query` + `openapi-fetch`; new deps: `idb` (IndexedDB), `vitest` + `fake-indexeddb` + `jsdom` (tests). Package manager: **pnpm** (run frontend commands from `ui/`). Service worker is hand-written (no Workbox dependency).

**Spec:** `docs/superpowers/specs/2026-06-04-offline-pwa-iphone-design.md`

---

## Key codebase facts (discovered during planning)

- The bulk endpoint `GET /v1/users/offline` already exists but returns raw `models.Note` whose `PDFContent` blob is serialized — must be fixed (Task 1).
- The author-search UI lives in `AuthorView` (`$api.useInfiniteQuery("get","/v1/authors")`). `AuthorSearchBar.tsx` is **dead code** (never rendered) — do not wire it.
- Folder roots: `FolderView` → `$api.useQuery("get","/v1/elements/parentDecks")` (returns root folders, `parent` null).
- Folder children: `Tree.onToggleFolder` → `http` shim `axios.get("/v1/elements/{id}/children")`.
- Note detail: `NoteDetailView` → `$api.useQuery("get","/v1/elements/notes/{noteId}")` → `NoteDetail` `{currentNote, previousNote, nextNote, index}` (server orders siblings by name).
- Note-list search: `SearchElementView`/`NoteSearchModal`/`ElementSearchBar` → `http` shim `axios.get("/v1/elements/notes?noteName=...")` → `{_embedded:{noteRepresentationModelList:Note[]}, page}`.
- Page shapes: `Page<T> = {_embedded: T, page: PageInfo}`; authors use `_embedded.authorRepresentationModelList`; notes use `_embedded.noteRepresentationModelList`. `PageInfo = {size, totalElements, totalPages, number}`.
- DTO mappers: `ConvertAuthorDtoFromModel(models.Author)`, `ConvertFolderDtoFromModel(models.Folder, fiber.Ctx)`, `ConvertNoteDtoFromModel(*models.Note, fiber.Ctx)`. `dto.Note` has no `pdfContent`.

---

## File structure

**Backend**
- `api_go/controllers/dto/OfflineData.go` — *Create.* Typed `OfflineDataResponse`.
- `api_go/controllers/user.go` — *Modify.* `GetOfflineData` maps through DTOs.
- `api_go/tests/offline_test.go` — *Create.* Regression test: no `pdfContent`.

**Frontend (new)**
- `ui/vitest.config.ts`, `ui/vitest.setup.ts` — test infra.
- `ui/src/offline/offlineQueries.ts` (+ `.test.ts`) — pure selectors.
- `ui/src/offline/offlineDb.ts` (+ `.test.ts`) — IndexedDB store + read helpers.
- `ui/src/offline/offlineSync.ts` (+ `.test.ts`) — `syncNow()`.
- `ui/src/offline/useOnlineStatus.ts` (+ `.test.ts`) — hook + boot flag.
- `ui/src/offline/offlineFallback.ts` (+ `.test.ts`) — synthesize offline responses.
- `ui/public/manifest.webmanifest`, `ui/public/icons/*`, `ui/public/sw.js` — PWA assets.

**Frontend (edited)**
- `ui/index.html` — manifest link + iOS meta.
- `ui/src/index.tsx` — offline boot, SW registration, sync-on-load.
- `ui/src/api/client.ts` — centralized offline fallback (apiFetch `onError` + `http` shim).
- `ui/src/components/layout/Header.tsx` — offline banner.
- `ui/src/components/Tree.tsx` — hide PDF action when offline.

---

## Task 1: Backend — strip PDF bytes from the offline payload

**Files:**
- Create: `api_go/controllers/dto/OfflineData.go`
- Modify: `api_go/controllers/user.go` (`GetOfflineData`, ~lines 170-197)
- Test: `api_go/tests/offline_test.go`

- [ ] **Step 1: Write the failing regression test**

Create `api_go/tests/offline_test.go`:
```go
package tests

import (
	"api_go/tests/builders"
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
)

func TestOfflineDataHasNoPdfContent(t *testing.T) {
	app := SetupTest(t)

	authorDto := builders.CreateAuthorDto()
	encoded, _ := json.Marshal(authorDto)
	createReq, _ := http.NewRequest("POST", "http://localhost/api/v1/authors", bytes.NewBuffer(encoded))
	createReq.Header.Set("Content-Type", "application/json")
	if _, err := app.Test(createReq); err != nil {
		t.Fatalf("failed to create author: %v", err)
	}

	req, _ := http.NewRequest("GET", "http://localhost/api/v1/users/offline", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to call offline endpoint: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.StatusCode)
	}

	body, _ := io.ReadAll(res.Body)
	if strings.Contains(string(body), "pdfContent") {
		t.Fatalf("offline payload must not contain pdfContent, got: %s", string(body))
	}

	var payload struct {
		Authors []map[string]any `json:"authors"`
		Folders []map[string]any `json:"folders"`
		Notes   []map[string]any `json:"notes"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("failed to decode offline payload: %v", err)
	}
	if len(payload.Authors) != 1 {
		t.Fatalf("expected 1 author in offline payload, got %d", len(payload.Authors))
	}
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `api_go/`): `go test ./tests/ -run TestOfflineDataHasNoPdfContent -v`
Expected: FAIL — body contains `pdfContent`.

- [ ] **Step 3: Create the typed DTO**

Create `api_go/controllers/dto/OfflineData.go`:
```go
package dto

// OfflineDataResponse is the bulk payload consumed by the PWA for offline use.
// It carries only metadata DTOs — never PDF bytes.
type OfflineDataResponse struct {
	Authors []Author `json:"authors"`
	Folders []Folder `json:"folders"`
	Notes   []Note   `json:"notes"`
}
```

- [ ] **Step 4: Rewrite `GetOfflineData`**

In `api_go/controllers/user.go`, replace `GetOfflineData` (and its godoc `@Success` line) with:
```go
// GetOfflineData godoc
// @Summary  Bulk download of all folders, authors and notes for offline use (metadata only)
// @Tags     users
// @Produce  json
// @Success  200  {object} dto.OfflineDataResponse
// @Router   /v1/users/offline [get]
func GetOfflineData(c fiber.Ctx) error {
	var folderService = GetLocal[service.FolderService](c, "folderService")
	var authorService = GetLocal[service.AuthorService](c, "authorService")
	var noteService = GetLocal[service.NoteService](c, "noteService")

	var userId = GetLocal[string](c, "userId")
	var folders, _ = folderService.LoadAllFolders(userId)
	var authors, _ = authorService.LoadAllAuthors(userId)
	var notes, _, _ = noteService.LoadAllNotes(userId, nil, nil)

	authorDtos := make([]dto.Author, 0, len(authors))
	for _, a := range authors {
		authorDtos = append(authorDtos, mappers.ConvertAuthorDtoFromModel(a))
	}
	folderDtos := make([]dto.Folder, 0, len(folders))
	for _, f := range folders {
		folderDtos = append(folderDtos, mappers.ConvertFolderDtoFromModel(f, c))
	}
	noteDtos := make([]dto.Note, 0, len(notes))
	for i := range notes {
		noteDtos = append(noteDtos, *mappers.ConvertNoteDtoFromModel(&notes[i], c))
	}

	return c.JSON(dto.OfflineDataResponse{
		Authors: authorDtos,
		Folders: folderDtos,
		Notes:   noteDtos,
	})
}
```
Note: `mappers` and `dto` are already imported. Remove `models` from the import block if it becomes unused (the compiler will report it).

- [ ] **Step 5: Run the test to verify it passes**

Run (from `api_go/`): `go test ./tests/ -run TestOfflineDataHasNoPdfContent -v`
Expected: PASS.

- [ ] **Step 6: Full backend build + tests**

Run (from `api_go/`): `go build ./... && go test ./...`
Expected: build succeeds; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add api_go/controllers/dto/OfflineData.go api_go/controllers/user.go api_go/tests/offline_test.go
git commit -m "fix(offline): return metadata DTOs from /v1/users/offline (drop pdfContent)"
```

---

## Task 2: Regenerate the OpenAPI types

**Files:** `api_go/docs/*` (generated), `ui/src/api/schema.ts` (generated)

- [ ] **Step 1: Regenerate Go swagger docs**

Run (from `api_go/`): `swag init`
(If missing: `go install github.com/swaggo/swag/cmd/swag@latest`, then `swag init`.)
Expected: `/v1/users/offline` now references `dto.OfflineDataResponse`.

- [ ] **Step 2: Regenerate frontend types**

Run (from `ui/`): `pnpm gen:api`
Expected: `ui/src/api/schema.ts` types the `/v1/users/offline` 200 body with `authors`/`folders`/`notes` arrays.

- [ ] **Step 3: Type-check**

Run (from `ui/`): `pnpm build`
Expected: build succeeds (no new type errors).

- [ ] **Step 4: Commit**

```bash
git add api_go/docs ui/src/api/schema.ts
git commit -m "chore(offline): regenerate OpenAPI types for /v1/users/offline"
```

---

## Task 3: Add the frontend test runner

**Files:** Create `ui/vitest.config.ts`, `ui/vitest.setup.ts`; modify `ui/package.json`.

- [ ] **Step 1: Install dependencies (from `ui/`)**

```bash
pnpm add idb
pnpm add -D vitest jsdom fake-indexeddb
```

- [ ] **Step 2: Add scripts to `ui/package.json`**

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `ui/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```
> The codebase imports `@/src/...` and the Rsbuild alias maps `@` → `./src`. This Vitest alias maps `@` → project root so `@/src/...` → `ui/src/...`. If the first `@/src/...` import (Task 4) fails to resolve, change the alias to `path.resolve(__dirname, "src")` and import as `@/...`; keep it consistent across all test files.

- [ ] **Step 4: Create `ui/vitest.setup.ts`**

```ts
import "fake-indexeddb/auto";
```

- [ ] **Step 5: Smoke test**

Create `ui/src/offline/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
describe("runner", () => {
  it("has indexedDB", () => { expect(typeof indexedDB).toBe("object"); });
});
```
Run (from `ui/`): `pnpm test`
Expected: 1 passing test.

- [ ] **Step 6: Remove smoke test + commit**

```bash
rm ui/src/offline/smoke.test.ts
git add ui/package.json ui/pnpm-lock.yaml ui/vitest.config.ts ui/vitest.setup.ts
git commit -m "chore(offline): add vitest + fake-indexeddb test infra"
```

---

## Task 4: Pure offline selectors (TDD)

**Files:** Create `ui/src/offline/offlineQueries.ts` + `ui/src/offline/offlineQueries.test.ts`.

- [ ] **Step 1: Write the failing tests**

Create `ui/src/offline/offlineQueries.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run (from `ui/`): `pnpm test -- offlineQueries`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `ui/src/offline/offlineQueries.ts`:
```ts
import type { Author, Folder, Note } from "@/src/api/types";
import type { NoteDetail } from "@/src/models/NoteDetail";

export type OfflineElement = Folder | Note;

/** Root folders = those without a parent (mirrors GET /v1/elements/parentDecks). */
export function selectRootFolders(folders: Folder[]): Folder[] {
  return folders.filter((f) => !f.parent);
}

/** Children of a folder = folders + notes whose parent.id matches (mirrors FindNextChildren). */
export function selectChildren(folderId: string, folders: Folder[], notes: Note[]): OfflineElement[] {
  return [
    ...folders.filter((f) => f.parent?.id === folderId),
    ...notes.filter((n) => n.parent?.id === folderId),
  ];
}

function includesCI(haystack: string | undefined, q: string): boolean {
  return (haystack ?? "").toLowerCase().includes(q);
}

/** Case-insensitive substring match on name (mirrors server name LIKE '%q%'). */
export function filterAuthorsByName(authors: Author[], query: string): Author[] {
  const q = query.trim().toLowerCase();
  return q ? authors.filter((a) => includesCI(a.name, q)) : authors;
}

export function filterNotesByName(notes: Note[], query: string): Note[] {
  const q = query.trim().toLowerCase();
  return q ? notes.filter((n) => includesCI(n.name, q)) : notes;
}

/** Build the note-detail view (current + prev/next sibling, ordered by name) from the local notes. */
export function selectNoteDetail(noteId: string, notes: Note[]): NoteDetail {
  const current = notes.find((n) => n.id === noteId);
  if (!current) {
    return { index: 0 } as NoteDetail;
  }
  const siblings = notes
    .filter((n) => n.parent?.id === current.parent?.id)
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  const idx = siblings.findIndex((n) => n.id === noteId);
  return {
    currentNote: current,
    previousNote: idx > 0 ? siblings[idx - 1] : undefined,
    nextNote: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : undefined,
    index: idx,
  } as NoteDetail;
}
```

- [ ] **Step 4: Run to verify it passes**

Run (from `ui/`): `pnpm test -- offlineQueries`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/src/offline/offlineQueries.ts ui/src/offline/offlineQueries.test.ts
git commit -m "feat(offline): pure selectors for roots/children/search/note-detail"
```

---

## Task 5: IndexedDB store wrapper (TDD)

**Files:** Create `ui/src/offline/offlineDb.ts` + `ui/src/offline/offlineDb.test.ts`.

- [ ] **Step 1: Write the failing tests**

Create `ui/src/offline/offlineDb.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  replaceAll, getAllAuthors, getAllFolders, getRootFolders, getChildren,
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
```

- [ ] **Step 2: Run to verify it fails**

Run (from `ui/`): `pnpm test -- offlineDb`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `ui/src/offline/offlineDb.ts`:
```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run (from `ui/`): `pnpm test -- offlineDb`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/src/offline/offlineDb.ts ui/src/offline/offlineDb.test.ts
git commit -m "feat(offline): IndexedDB store wrapper + read helpers"
```

---

## Task 6: Sync module (TDD)

**Files:** Create `ui/src/offline/offlineSync.ts` + `ui/src/offline/offlineSync.test.ts`.

- [ ] **Step 1: Write the failing tests**

Create `ui/src/offline/offlineSync.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/src/api/client", () => ({ apiFetch: { GET: vi.fn() } }));

import { apiFetch } from "@/src/api/client";
import { syncNow } from "./offlineSync";
import { getAllAuthors, getLastSyncedAt, clearOfflineData, replaceAll } from "./offlineDb";

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
    await replaceAll("authors", [{ id: "old", name: "Old" } as any]);
    mockedGet.mockResolvedValue({ data: { authors: "nope" }, error: undefined });
    await expect(syncNow()).rejects.toThrow();
    expect((await getAllAuthors()).map((a) => a.id)).toEqual(["old"]);
  });

  it("throws and preserves data on fetch error", async () => {
    await replaceAll("authors", [{ id: "old", name: "Old" } as any]);
    mockedGet.mockResolvedValue({ data: undefined, error: { message: "network" } });
    await expect(syncNow()).rejects.toThrow();
    expect((await getAllAuthors()).map((a) => a.id)).toEqual(["old"]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (from `ui/`): `pnpm test -- offlineSync`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `ui/src/offline/offlineSync.ts`:
```ts
import { apiFetch } from "@/src/api/client";
import type { Author, Folder, Note } from "@/src/api/types";
import { replaceAll, setLastSyncedAt } from "./offlineDb";

type OfflinePayload = { authors: Author[]; folders: Folder[]; notes: Note[] };

function isValidPayload(p: unknown): p is OfflinePayload {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return Array.isArray(o.authors) && Array.isArray(o.folders) && Array.isArray(o.notes);
}

/** Pull the full metadata payload and full-replace local stores. Throws WITHOUT mutating data on failure. */
export async function syncNow(): Promise<void> {
  const { data, error } = await apiFetch.GET("/v1/users/offline");
  if (error || !data) throw new Error("offline sync: request failed");
  if (!isValidPayload(data)) throw new Error("offline sync: malformed payload");
  await replaceAll("authors", data.authors);
  await replaceAll("folders", data.folders);
  await replaceAll("notes", data.notes);
  await setLastSyncedAt(Date.now());
}
```

- [ ] **Step 4: Run to verify it passes**

Run (from `ui/`): `pnpm test -- offlineSync`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/src/offline/offlineSync.ts ui/src/offline/offlineSync.test.ts
git commit -m "feat(offline): syncNow() full-replace from /v1/users/offline"
```

---

## Task 7: Online-status hook + boot offline flag

**Files:** Create `ui/src/offline/useOnlineStatus.ts` + `ui/src/offline/useOnlineStatus.test.ts`.

- [ ] **Step 1: Write the failing test**

Create `ui/src/offline/useOnlineStatus.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { getOfflineBoot, setOfflineBoot } from "./useOnlineStatus";

describe("offlineBoot flag", () => {
  it("defaults to false and can be set", () => {
    expect(getOfflineBoot()).toBe(false);
    setOfflineBoot(true);
    expect(getOfflineBoot()).toBe(true);
    setOfflineBoot(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (from `ui/`): `pnpm test -- useOnlineStatus`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `ui/src/offline/useOnlineStatus.ts`:
```ts
import { useSyncExternalStore } from "react";

let offlineBoot = false;
export function getOfflineBoot(): boolean { return offlineBoot; }
export function setOfflineBoot(value: boolean): void { offlineBoot = value; }

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** Reactive online/offline status. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
```

- [ ] **Step 4: Run to verify it passes**

Run (from `ui/`): `pnpm test -- useOnlineStatus`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/src/offline/useOnlineStatus.ts ui/src/offline/useOnlineStatus.test.ts
git commit -m "feat(offline): useOnlineStatus hook + boot offline flag"
```

---

## Task 8: PWA manifest, icons, and iOS meta tags

**Files:** Create `ui/public/manifest.webmanifest`, `ui/public/icons/*`; modify `ui/index.html`.

- [ ] **Step 1: Generate icons (from `ui/`, ImageMagick)**

```bash
mkdir -p public/icons
magick -background none public/package.svg -resize 192x192 public/icons/icon-192.png
magick -background none public/package.svg -resize 512x512 public/icons/icon-512.png
magick -background none public/package.svg -resize 410x410 -gravity center -extent 512x512 public/icons/maskable-512.png
magick -background none public/package.svg -resize 180x180 public/icons/apple-touch-icon.png
```
Expected: four PNGs under `ui/public/icons/`. (If ImageMagick is unavailable, produce equivalent PNGs by any means with these names/sizes.)

- [ ] **Step 2: Create `ui/public/manifest.webmanifest`**

```json
{
  "name": "SmartOrganizr",
  "short_name": "SmartOrganizr",
  "start_url": "/ui/",
  "scope": "/ui/",
  "display": "standalone",
  "background_color": "#1f2937",
  "theme_color": "#1f2937",
  "icons": [
    { "src": "/ui/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/ui/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/ui/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 3: Add to `ui/index.html` `<head>` (after the viewport meta)**

```html
    <link rel="manifest" href="/ui/manifest.webmanifest" />
    <meta name="theme-color" content="#1f2937" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="SmartOrganizr" />
    <link rel="apple-touch-icon" href="/ui/icons/apple-touch-icon.png" />
```

- [ ] **Step 4: Build + verify**

Run (from `ui/`): `pnpm build`
Expected: `ui/dist/manifest.webmanifest` and `ui/dist/icons/*.png` exist.

- [ ] **Step 5: Commit**

```bash
git add ui/public/manifest.webmanifest ui/public/icons ui/index.html
git commit -m "feat(offline): PWA manifest, icons, iOS meta tags"
```

---

## Task 9: Service worker + registration

**Files:** Create `ui/public/sw.js`; modify `ui/src/index.tsx` (registration only).

- [ ] **Step 1: Create `ui/public/sw.js`**

```js
const CACHE = "smartorganizr-shell-v1";
const APP_SHELL = ["/ui/", "/ui/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/ui/index.html")));
    return;
  }
  if (url.pathname === "/public") {
    event.respondWith(
      fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req)),
    );
    return;
  }
  if (url.origin === self.location.origin && url.pathname.startsWith("/ui/")) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res;
      })),
    );
    return;
  }
});
```

- [ ] **Step 2: Register in `ui/src/index.tsx` (after `applyTheme(...)`)**

```ts
if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/ui/sw.js", { scope: "/ui/" })
      .catch((err) => console.log("Service worker registration failed", err));
  });
}
```

- [ ] **Step 3: Build + verify**

Run (from `ui/`): `pnpm build`
Expected: `ui/dist/sw.js` exists.

- [ ] **Step 4: Desktop smoke test**

Serve the built app (Go server or `pnpm preview`), open DevTools → Application → Service Workers, confirm `sw.js` activated; toggle Offline + reload → shell loads.

- [ ] **Step 5: Commit**

```bash
git add ui/public/sw.js ui/src/index.tsx
git commit -m "feat(offline): hand-written service worker + registration"
```

---

## Task 10: Offline boot sequence

**Files:** Modify `ui/src/index.tsx` (`initKeycloak`, `bootstrapApp`).

- [ ] **Step 1: Make `initKeycloak` reject on error**

In `initKeycloak`, add `reject` to the Promise executor and call it in `.catch`:
```ts
    return new Promise((resolve, reject) => {
        keycloak.init({onLoad: onLoadMode, silentCheckSsoFallback: true, checkLoginIframe: false })
            .then((res) => {
                // ...unchanged...
            })
            .catch((error) => {
                console.log("Error is", error)
                reject(error)
            })
    })
```

- [ ] **Step 2: Add imports + cache key (top of `index.tsx`)**

```ts
import { getLastSyncedAt } from "@/src/offline/offlineDb";
import { syncNow } from "@/src/offline/offlineSync";
import { setOfflineBoot } from "@/src/offline/useOnlineStatus";

const KEYCLOAK_CONFIG_CACHE_KEY = "smartorganizr-keycloak-config";
```

- [ ] **Step 3: Replace `bootstrapApp` (and its trailing call)**

```ts
type CachedKeycloakConfig = { clientId: string; realm: string; url: string };

const renderOfflineNotice = (title: string, message: string) => {
    root.render(
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", padding: "1.5rem", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
            <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>{title}</h1>
            <p style={{ color: "#6b7280" }}>{message}</p>
        </div>
    );
};

const bootstrapApp = async () => {
    if (keycloak !== undefined) return;

    let config: CachedKeycloakConfig | null = null;
    try {
        const resp = await axios.get("/../public");
        config = { clientId: resp.data.clientId, realm: resp.data.realm, url: resp.data.url };
        localStorage.setItem(KEYCLOAK_CONFIG_CACHE_KEY, JSON.stringify(config));
    } catch {
        const cached = localStorage.getItem(KEYCLOAK_CONFIG_CACHE_KEY);
        config = cached ? (JSON.parse(cached) as CachedKeycloakConfig) : null;
    }

    if (!config) {
        renderOfflineNotice("You're offline", "Connect to the internet once to set up SmartOrganizr for offline use.");
        return;
    }

    accountURL = config.url + "/realms/" + config.realm + "/account";
    setKeycloak(config.clientId, config.realm, config.url);

    if (navigator.onLine) {
        try { await initKeycloak(keycloak); } catch (error) { console.log("Keycloak init failed", error); }
        renderApp(keycloak);
        syncNow().catch((error) => console.log("Background offline sync failed", error));
        return;
    }

    const lastSynced = await getLastSyncedAt();
    if (lastSynced) {
        setOfflineBoot(true);
        renderApp(keycloak);
    } else {
        renderOfflineNotice("You're offline", "Connect to the internet once to download your library for offline use.");
    }
};

bootstrapApp().then(() => { console.log("Started") });
```
(Delete the previous `bootstrapApp` definition and its old trailing `bootstrapApp().then(...)`.)

- [ ] **Step 4: Build**

Run (from `ui/`): `pnpm build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add ui/src/index.tsx
git commit -m "feat(offline): offline-aware boot sequence + background sync"
```

---

## Task 11: Offline fallback response builder (TDD)

**Files:** Create `ui/src/offline/offlineFallback.ts` + `ui/src/offline/offlineFallback.test.ts`.

**Context:** Builds synthesized responses from IndexedDB for the read endpoints, matching each endpoint's JSON shape. Used by `client.ts` in Task 12. `$api` (openapi-fetch) needs a `Response`; the `http` shim needs a `{data, status, headers}` object.

- [ ] **Step 1: Write the failing tests**

Create `ui/src/offline/offlineFallback.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run (from `ui/`): `pnpm test -- offlineFallback`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `ui/src/offline/offlineFallback.ts`:
```ts
import { searchAuthors, searchNotes, getRootFolders, getChildren, getNoteDetail } from "./offlineDb";

function pageJson(key: "authorRepresentationModelList" | "noteRepresentationModelList", items: unknown[]) {
  return {
    _embedded: { [key]: items },
    page: { size: items.length, totalElements: items.length, totalPages: 1, number: 0 },
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

/** Synthesize an openapi-fetch ($api) GET response from IndexedDB; undefined if the path isn't offline-served. */
export async function buildOfflineApiResponse(url: URL): Promise<Response | undefined> {
  const p = url.pathname;
  if (p.endsWith("/v1/authors")) {
    return jsonResponse(pageJson("authorRepresentationModelList", await searchAuthors(url.searchParams.get("name") ?? "")));
  }
  if (p.endsWith("/v1/elements/parentDecks")) {
    return jsonResponse(await getRootFolders());
  }
  const noteDetail = p.match(/\/v1\/elements\/notes\/([^/]+)$/);
  if (noteDetail) {
    return jsonResponse(await getNoteDetail(decodeURIComponent(noteDetail[1])));
  }
  return undefined;
}

type HttpLike = { data: unknown; status: number; headers: Headers };

/** Synthesize an http-shim GET response from IndexedDB; undefined if the path isn't offline-served. */
export async function buildOfflineHttpResponse(rawUrl: string): Promise<HttpLike | undefined> {
  const url = new URL(rawUrl, window.location.origin);
  const p = url.pathname;
  const children = p.match(/\/v1\/elements\/([^/]+)\/children$/);
  if (children) {
    return { data: await getChildren(decodeURIComponent(children[1])), status: 200, headers: new Headers() };
  }
  if (p.endsWith("/v1/elements/notes")) {
    return { data: pageJson("noteRepresentationModelList", await searchNotes(url.searchParams.get("noteName") ?? "")), status: 200, headers: new Headers() };
  }
  return undefined;
}
```

- [ ] **Step 4: Run to verify it passes**

Run (from `ui/`): `pnpm test -- offlineFallback`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/src/offline/offlineFallback.ts ui/src/offline/offlineFallback.test.ts
git commit -m "feat(offline): build synthesized offline responses from local store"
```

---

## Task 12: Wire the centralized fallback into `client.ts`

**Files:** Modify `ui/src/api/client.ts`.

**Context:** Add offline recovery so existing call sites keep working with no changes. `apiFetch` gets an `onError` middleware (fires when fetch rejects — i.e., offline/network failure). The `http` shim gets an offline pre-check + catch.

- [ ] **Step 1: Add imports**

At the top of `ui/src/api/client.ts`:
```ts
import { buildOfflineApiResponse, buildOfflineHttpResponse } from "@/src/offline/offlineFallback";
```

- [ ] **Step 2: Extend the `apiFetch.use({...})` middleware with `onError`**

Replace the existing `apiFetch.use({ onRequest(...) })` block with:
```ts
apiFetch.use({
    onRequest({ request }) {
        if (keycloak?.token) {
            request.headers.set("Authorization", `Bearer ${keycloak.token}`);
        }
        return request;
    },
    async onError({ request, error }) {
        // fetch rejected (offline / network failure) — try serving from the local store.
        if (request.method === "GET") {
            const offline = await buildOfflineApiResponse(new URL(request.url));
            if (offline) return offline;
        }
        throw error;
    },
});
```
> Verify against the installed `openapi-fetch` (^0.17): `onError` should receive `{ request, error }` and may return a `Response` to recover. If `request` is absent in `onError` for this version, capture the URL in `onRequest` (e.g. a module-level `let lastUrl`) and use it in `onError`.

- [ ] **Step 3: Add offline handling to the `http` shim `request()`**

In `request(...)`, replace the single `const response = await authFetch(...)` line with an offline pre-check + try/catch:
```ts
    if (method === "GET" && typeof navigator !== "undefined" && !navigator.onLine) {
        const offline = await buildOfflineHttpResponse(finalUrl);
        if (offline) return offline as HttpResponse<T>;
    }

    let response: Response;
    try {
        response = await authFetch(finalUrl, { method, body: payload, headers });
    } catch (networkErr) {
        if (method === "GET") {
            const offline = await buildOfflineHttpResponse(finalUrl);
            if (offline) return offline as HttpResponse<T>;
        }
        throw networkErr;
    }
```
(The rest of `request()` — the `if (!response.ok)` block and `parseBody` — stays unchanged.)

- [ ] **Step 4: Build + run the full test suite**

Run (from `ui/`): `pnpm build && pnpm test`
Expected: build succeeds; all offline tests pass.

- [ ] **Step 5: Commit**

```bash
git add ui/src/api/client.ts
git commit -m "feat(offline): centralized offline read fallback in api client"
```

---

## Task 13: Offline banner + hide online-only actions

**Files:** Modify `ui/src/components/layout/Header.tsx`, `ui/src/components/Tree.tsx`.

**Context:** Data now works offline automatically. Add the banner and hide actions that can't work offline (PDF view fetches `/pdf`).

- [ ] **Step 1: Offline banner in the header**

In `ui/src/components/layout/Header.tsx`, add the import:
```ts
import { useOnlineStatus } from "@/src/offline/useOnlineStatus";
```
and render near the top of the header markup:
```tsx
{!useOnlineStatus() && (
    <div style={{ background: "#92400e", color: "white", textAlign: "center", padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}>
        Offline — showing your downloaded library. Connect to sync, view PDFs, or make changes.
    </div>
)}
```
> If a Tailwind `Alert`/`Banner` component exists in the design system, use it instead of inline styles.

- [ ] **Step 2: Hide the PDF "eye" action when offline (`Tree.tsx`, `TreeNode`)**

Add inside `TreeNode`:
```ts
    const isOnline = useOnlineStatus();
```
(and import `useOnlineStatus` at the top). Change the PDF action condition from:
```ts
{isNote(element) && element.pdfAvailable && (
```
to:
```ts
{isNote(element) && element.pdfAvailable && isOnline && (
```

- [ ] **Step 3: Build**

Run (from `ui/`): `pnpm build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add ui/src/components/layout/Header.tsx ui/src/components/Tree.tsx
git commit -m "feat(offline): offline banner + hide PDF action when offline"
```

---

## Task 14: Full test pass + manual iPhone verification

**Files:** none (verification only).

- [ ] **Step 1: Full frontend tests** — Run (from `ui/`): `pnpm test`. Expected: all pass.
- [ ] **Step 2: Full backend** — Run (from `api_go/`): `go build ./... && go test ./...`. Expected: all pass.
- [ ] **Step 3: Desktop offline smoke test** — Build, serve via Go server, log in once (triggers background `syncNow`). DevTools → Application: confirm `smartorganizr-offline` IndexedDB has authors/folders/notes + `meta.lastSyncedAt`. Toggle Offline, reload: app renders; folder tree browses; author search (`/authors`) filters locally; note search filters locally; opening a note shows metadata + prev/next; PDF action hidden; banner shows.
- [ ] **Step 4: iPhone verification** — Serve over HTTPS. Safari → log in once → Share → Add to Home Screen. Launch from home screen, enable Airplane Mode, verify: cold launch renders; browse tree; author search; note metadata + navigation; PDF action hidden; banner shows.
- [ ] **Step 5: Lighthouse PWA audit** — Confirm "Installable" passes; no manifest/SW errors. Fix anything flagged.
- [ ] **Step 6: Final commit (if fixes were needed)**

```bash
git add -A
git commit -m "test(offline): verification fixes for offline PWA"
```

---

## Self-review notes (for the implementer)

- **Spec coverage:** §6 backend → Task 1-2; §7.1 shell → Task 8; §7.2 SW → Task 9; §7.3 offlineDb → Task 5; §7.4 sync → Task 6; §7.5 status → Task 7; §7.6 read branches (authors, parentDecks, children, note-list, note-detail) → Tasks 11-12 (centralized); §8 boot → Task 10; §9 UI states → Task 13; §10 error handling → Tasks 6/10/12; §12 testing → Task 14. All covered.
- **`AuthorSearchBar` is dead code** — not wired. The author-search UX is `AuthorView`, handled by the centralized fallback (no component edit needed).
- **`@` alias in tests:** Task 3 Step 3 note — resolve on the first `@/src/...` import (Task 4) and keep consistent.
- **`openapi-fetch` `onError` contract:** Task 12 Step 2 note — verify `{request, error}` shape and Response-recovery against the installed `^0.17`; fall back to capturing the URL in `onRequest` if needed.
- **Note ordering:** `selectNoteDetail` sorts siblings with `localeCompare`; the server uses SQL `ORDER BY note.name`. Minor ordering differences are acceptable for offline navigation.
- **Service worker scope:** the Go server serves `dist` under `/ui`, so `/ui/sw.js` with scope `/ui/` needs no `Service-Worker-Allowed` header.
- **Write actions offline:** create/edit/delete remain visible but will fail offline (errors are caught/logged). Task 13 hides the PDF action; hiding create/edit/delete is a low-risk future polish if desired.
