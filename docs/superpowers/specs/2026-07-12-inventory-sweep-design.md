# Inventory Sweep (Inventur-Modus) — Design

**Date:** 2026-07-12
**Status:** Implemented (2026-07-12; migration `00028_inventory_sweep.sql`,
`service/inventoryService.go`, `controllers/inventory.go`,
`ui/src/pages/InventoryView.tsx`)

## Goal

Track where physical sheet music actually lives (which Mappe) with **zero
per-sheet labeling**. QR stickers and per-sheet NFC chips failed in practice
(too small to scan reliably / too expensive and fiddly on iPhone). The insight:
a sheet's first page already *is* its identifier — title, composer, and part
are printed on it, and the app already has camera OCR (`scanNoteSheet`,
tesseract.js) and AI music identification (`identifyMusic`). We reuse both.

The workflow is **periodic reconciliation, not real-time tracking**: musicians
will never check sheets in and out. Instead, a "sweep" captures *what is in
this Mappe right now* (flip through, photograph each first page, confirm
matches), and the app diffs that against the last known state: what's new
here, what moved where, what has gone missing.

Optionally, each physical Mappe gets **one** NFC tag (or printed QR) whose
only payload is a deep link that opens the sweep screen for that folder —
solving the "which Mappe am I holding" step without labeling any sheets.

## Scope

**In scope (this spec):**
- Sweep sessions per folder: start, photograph & match sheets, complete.
- Matching pipeline: client OCR text → server fuzzy match against the user's
  notes → AI vision fallback (only when `AiEnabled`) → manual pick.
- Human-friendly inventory numbers per note (for stamping every loose page)
  and an orphan-page lookup (number → piece + current Mappe).
- Page-count completeness check during sweeps (`numberOfPages` exists).
- Diff report on completion: present / new here (moved from X) / missing
  (last seen when & where), with one-tap "apply moves" (updates `parent`).
- "Last seen" surfaced on the note detail page.
- NFC/QR deep link per Mappe: tag stores only a URL with a tag UUID; the app
  resolves it to the bound folder and opens the sweep screen.

**Out of scope (future):**
- Per-sheet labels of any kind.
- Real-time check-in/check-out.
- Club-scoped Mappen (notes are user-scoped today; inventory follows).
- Counting multiple copies of the same title within one Mappe.
- Offline sweeps against the IndexedDB library (the offline PWA layer makes
  this feasible later — OCR already runs client-side; queue sightings and
  sync on reconnect).

## Physical identity: why the Mappe tag is only a pointer

NFC tags hold almost nothing: an NTAG213 has ~144 usable bytes (≈ a 130-char
URL), NTAG216 ~888 bytes. A Mappe's contents will never fit — and must not:
the list would be stale the moment a sheet moves. The tag therefore stores
only

```
https://<host>/ui/inventory?tag=<uuid>
```

and the DB remains the single source of truth. This also means the cheapest
tags (NTAG213 stickers, ~0.30–0.50 €) suffice, and a printed QR with the same
URL works as a free alternative — at Mappe size (5×5 cm on the cover) QR
scanning is reliable; it only failed at per-sheet sticker size.

iOS constraint: iPhones background-read NFC URL tags natively (no app
needed — Safari opens the PWA route), but **web pages cannot write tags on
iOS** (no Web NFC). Binding flow: the app generates the tag UUID and shows
the URL (+ QR to print); the user writes it once with any free writer app
(e.g. "NFC Tools"). No in-app writing.

## Loose pages: the inventory number

A piece is typically ~10 loose sheets. Only the first page carries a title;
when pages scatter, page 7 is unidentifiable by content alone (no title, at
best a running header). Codes failed at per-sheet size — but a **plain
stamped number does not**: big digits are readable by humans *and* by the
existing OCR pipeline, survive photocopying, and stamping 10 pages takes
seconds (self-inking numbering stamp, or handwritten).

Design:

- Every note gets a short sequential **inventory number** per user
  (`elements.inventory_no`, assigned on demand), displayed everywhere as
  `Nr. 421`. The physical convention is to stamp `421` — optionally
  `421 · 3/10` — on every sheet of the piece.
- **The sweep is the stamping opportunity.** The first inventory touches
  every piece anyway; after each match the sweep screen shows the number
  prominently ("Stempel: 421 auf alle Blätter") until dismissed. Zero extra
  workflow, the labeling happens as a by-product of the first sweep.
- **Orphan-page lookup:** a found loose sheet → enter (or photograph, OCR
  reads big digits trivially) the stamped number → the app answers with
  piece, current Mappe, and last-seen info: "gehört zu Armenian Dances,
  Mappe Flöte 1".
- **Completeness check:** notes already carry `numberOfPages`. The sweep's
  confirm step shows "10 Blätter?" as a one-tap verification; a mismatch
  flags the sighting as `incomplete`, and the report gets a fourth section
  (unvollständig). Cheap to answer while the piece is in hand, and it
  catches the salad *before* pages go missing for good.

Rejected for loose pages: per-sheet QR/NFC (the original failure), and
content-based identification of titleless pages (matching a photo against
stored PDFs is listed as future work — it only helps where a PDF exists and
is far less reliable than reading a fat stamped digit).

## Data model

New migration `00028_inventory_sweep.sql` (5-digit padding — sqlc ordering).
Queries in `data/sql/queries/query.sql`, sqlc-generated types; no hand-written
`db/*_queries.go`.

### `elements.inventory_no` (new column)

`INT NULL` + `UNIQUE (user_id_fk, inventory_no)`. Assigned lazily: first
sighting (or explicit "Nummer vergeben" on the note) takes
`MAX(inventory_no)+1` for the user. Nullable so existing libraries are
untouched until swept.

### `mappe_tag`
| column | type | notes |
|---|---|---|
| `tag_id` | varchar(36) PK | UUID, the value inside the NFC URL / QR |
| `folder_fk` | varchar(36) FK → `elements.id`, UNIQUE, cascade | the bound folder |
| `user_fk` | varchar(255) FK → `user.id`, collate utf8mb4_general_ci | owner |
| `created_at` | timestamp default now | |

Separate table (not a column on `elements`): keeps the busiest table
untouched and allows re-binding a tag to a new folder by replacing the row.

### `inventory_sweep`
| column | type | notes |
|---|---|---|
| `id` | varchar(36) PK | UUID |
| `folder_fk` | varchar(36) FK → `elements.id`, cascade | the Mappe being swept |
| `user_fk` | varchar(255) FK → `user.id` | who swept |
| `started_at` | timestamp default now | |
| `completed_at` | timestamp null | null = in progress; diffs only use completed sweeps |

### `inventory_sighting`
| column | type | notes |
|---|---|---|
| `sweep_fk` | varchar(36) FK → `inventory_sweep.id`, cascade | |
| `note_fk` | varchar(36) FK → `elements.id`, cascade | the identified note |
| `matched_via` | ENUM('OCR','AI','MANUAL') | how the match was made |
| `confidence` | tinyint null | 0–100, null for MANUAL |
| `incomplete` | bool default false | page-count check failed ("nur 8 von 10 Blättern") |
| `created_at` | timestamp default now | |
| PK | (`sweep_fk`, `note_fk`) | same note twice in one sweep = no-op ("schon erfasst") |

Nothing else is stored. Derived at query time:
- **last seen** per note = newest completed sweep containing it (join).
- **missing** = notes with `parent = folder` not sighted in that folder's
  latest completed sweep.
- **new here / moved** = sighted notes whose `parent` is a different folder.

## Matching pipeline

1. **Client:** capture photo → run existing tesseract.js OCR (top third of
   the page is enough) → send extracted text + compressed image
   (`compressImageForAI`) to the identify endpoint.
2. **Server, text pass:** normalize (lowercase, strip punctuation, collapse
   whitespace, drop part tokens like "flöte 1", "partitur") and rank the
   user's notes by similarity (candidate set via existing
   `FindElementsByUserAndNameLike` on the longest OCR words, then
   Levenshtein/token-overlap ranking in Go — no MySQL extensions).
3. **Server, AI fallback:** if the best text score is below the confident
   threshold *and* `AiEnabled`, run the existing `identifyMusic` vision call
   and re-match its title/composer output.
4. **Response:** ranked candidates with confidence. Client auto-accepts
   ≥ 90 with an undo toast; otherwise shows a pick sheet (top 5 + search
   field → `matched_via = MANUAL`).

## API

All under the authenticated `v1` group, user-scoped like notes:

| method | path | purpose |
|---|---|---|
| `POST` | `/v1/inventory/identify` | body: `{ocrText, imageBase64?}` → ranked candidates |
| `POST` | `/v1/inventory/sweeps` | body: `{folderId}` → sweep id (403 if folder not owned) |
| `POST` | `/v1/inventory/sweeps/{id}/sightings` | body: `{noteId, matchedVia, confidence?}`; idempotent |
| `POST` | `/v1/inventory/sweeps/{id}/complete` | sets `completed_at`, returns the diff report |
| `POST` | `/v1/inventory/sweeps/{id}/apply-moves` | body: `{noteIds}` → sets `parent` to the swept folder |
| `PUT` | `/v1/inventory/folders/{folderId}/tag` | bind/rotate a tag; returns `{tagId, url}` |
| `GET` | `/v1/inventory/tags/{tagId}` | resolve tag → `{folderId, folderName}` |
| `GET` | `/v1/inventory/lookup?no=421` | orphan page: number → `{noteId, name, folderName, lastSeenAt}` |
| `POST` | `/v1/inventory/notes/{noteId}/number` | assign next free number (idempotent, returns existing) |
| `GET` | `/v1/inventory/notes/{noteId}/last-seen` | newest completed-sweep sighting for the note detail page |

(All inventory endpoints live under one `v1/inventory` route group rather than
spreading over folder/note groups.)

Diff report shape:

```json
{
  "present":  [{ "noteId": "...", "name": "..." }],
  "newHere":  [{ "noteId": "...", "name": "...", "previousFolderId": "...", "previousFolderName": "..." }],
  "missing":  [{ "noteId": "...", "name": "...", "lastSeenAt": "...", "lastSeenFolderName": "..." }]
}
```

## UI

- **Entry points:** "Inventur starten" action on a folder in the tree / folder
  view; and the route `/ui/inventory?tag=<uuid>` (NFC/QR deep link) which
  resolves the tag and jumps straight into a new sweep for the bound folder.
- **Sweep screen:** full-screen camera loop reusing the `scanNoteSheet`
  capture path. Each shot → matching spinner → auto-accept toast (with
  Rückgängig) or pick sheet. After each match: the inventory number, big
  ("Stempel: 421"), plus the one-tap page-count check ("10 Blätter? ✓/✗").
  A running counter + list of sighted titles; "Fertig" completes the sweep.
- **Orphan finder:** small "Loses Blatt?" entry on the inventory screen —
  number pad (or camera + digit OCR) → piece, Mappe, last seen.
- **Report screen:** four sections (vorhanden / neu hier / fehlt /
  unvollständig) per the diff shape, with "Verschiebungen übernehmen"
  (calls apply-moves) and a per-item dismiss. Missing items link to the note.
- **Note detail:** "Zuletzt gesehen: {Mappe}, {Datum}" line when sighting
  data exists.
- **Folder settings:** "NFC-Tag / QR koppeln" — generates the tag, shows the
  URL and a printable QR, explains the one-time write via a writer app.
- i18n: new `inventory.*` group in `de.json`/`en.json`.

## Testing

- **Unit:** normalization + ranking table tests (umlauts, part tokens, OCR
  noise like `Armen1an Dances`); confidence thresholds.
- **Integration (testcontainers, auth pinned to "12345"):** sweep lifecycle;
  diff correctness for moved/missing/new/incomplete (seed second folder,
  move a note); apply-moves updates `parent`; sighting idempotency; tag
  bind → resolve → 403 for foreign folders; identify endpoint text-pass
  matching (AI pass mocked/skipped without token); inventory-no assignment
  is gapless-per-user, idempotent, and unique under concurrency; orphan
  lookup resolves number → note + Mappe.
- **UI (vitest):** diff-report rendering helper; auto-accept threshold logic.

## Future work

- Offline sweeps: OCR is already client-side; match against the IndexedDB
  library, queue sightings, sync on reconnect (builds on the offline PWA
  layer and `runSync`).
- Club-scoped Mappen once notes gain club scope.
- Copy counts per title within a Mappe.
- "Fehlt seit N Inventuren" nudges on the dashboard.
