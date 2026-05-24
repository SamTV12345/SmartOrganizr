# Wikidata Autocomplete — Implementation Handoff

Status as of branch `feat/wikidata-autocomplete` (9 commits ahead of master).

## What's done

### Backend (Phases 1-6)
- **Migration `0000016_wikidata_autocomplete.sql`** — adds `wikidata_id`, `birth_year`, `death_year` on `authors`; adds `wikidata_id`, `composition_year`, `genre`, `composer_id_fk`, `arranger_id_fk` on `elements`; backfills `composer_id_fk` from the old `author_id_fk` and drops the old column. **Not yet applied to your DB** — see "What you need to do" below.
- **DB layer**: hand-patched `db/query.sql.go` to rename `AuthorIDFk` → `ComposerIDFk` everywhere and to extend `CreateAuthor`/`UpdateAuthor` with the new fields. New queries (`FindAuthorByUserAndWikidataId`, `FindAuthorsByUserAndExactName`, `FindAuthorsByUserAndNameLike`, `FindElementsByUserAndNameLike`, `CreateNoteWithWikidata`) live in `db/wikidata_queries.go` following the `chat_queries.go` hand-written pattern.
- **Models / mappers / DTOs**: extended `models.Author` and `models.Note` with the new fields; `models.Note` keeps a single `Author` (interpreted as composer) plus optional `Arranger *Author` — pragmatic deviation from the spec to minimize blast radius across the existing code.
- **WikidataService** (`api_go/service/wikidataService.go`) — SPARQL client targeting `https://query.wikidata.org/sparql` with `SearchWorks`, `SearchAuthors`, `GetWorkDetail` (with composer → author → performer fallback), `GetAuthorDetail`. Six unit tests with httptest mock server.
- **ResolveAuthor** (`api_go/service/authorResolution.go`) — three resolution paths (QID match, same-name-without-QID conflict, fresh create). Designed against an `AuthorResolver` interface; four unit tests with `fakeResolver`. Production `sqlcAuthorResolver` adapter wired to `AuthorService`.
- **Endpoints** (registered in `setupRouter.go`):
  - `GET /api/v1/autocomplete/works?q=...` — parallel local + Wikidata results
  - `GET /api/v1/autocomplete/authors?q=...` — same shape, authors
  - `POST /api/v1/works/from-wikidata` — `{wikidataId, parentId, forceNewAuthor?}` → 200 Note, or 409 with `{incoming, candidates}` on author name collision
- **All Go tests green**: `go test ./service/ ./mappers/` passes. The `TestGetAuthors0Users` testcontainers test requires Docker and is unrelated to this work.

### Frontend (Phase 7 — building blocks only, not integrated)
- `ui/src/models/Autocomplete.ts` — TS mirror of the new DTOs
- `ui/src/api/autocomplete.ts` — `fetchWorksAutocomplete`, `fetchAuthorsAutocomplete`, `createWorkFromWikidata` (returns `{ note }` or `{ conflict }`)
- `ui/src/hooks/useDebouncedAutocomplete.ts` — 300ms debounce hook
- `ui/src/components/searchBars/WorkAutocompleteInput.tsx` — input + two-section dropdown ("Aus meiner Sammlung" / "Aus Wikidata")
- `ui/src/components/AuthorConflictDialog.tsx` — 409 dialog
- `ui/src/components/WikidataBadge.tsx` — small "W" pill for enriched list rows
- TypeScript clean (`tsc --noEmit` passes for the new files)

## What you need to do

1. **Apply the migration to your DB**:
   ```
   goose -dir api_go/data/sql/migrations mysql "<connection>" up
   ```
   `goose` isn't installed on this machine — that's why I couldn't run it. If you have any existing notes, their `author_id_fk` will be copied to `composer_id_fk` by the migration's `UPDATE` step.

2. **Regenerate swag docs + OpenAPI TS types** so the frontend's typed API client knows about the new DTO fields:
   ```
   cd api_go && swag init -g main.go
   cd ../ui && npm run gen:api
   ```
   Then delete `ui/src/models/Autocomplete.ts` and switch imports to use the generated types from `ui/src/api/types.ts` (add `AutocompleteWork`, `AutocompleteAuthor`, etc. there).

3. **Wire the components into your Create Note flow**. The `CreateFolderOrNote.tsx` form is the natural insertion point. Sketch:
   ```tsx
   import { WorkAutocompleteInput } from "@/src/components/searchBars/WorkAutocompleteInput";
   import { AuthorConflictDialog } from "@/src/components/AuthorConflictDialog";
   import { createWorkFromWikidata } from "@/src/api/autocomplete";
   
   const [conflict, setConflict] = useState(null);
   const [pendingQid, setPendingQid] = useState<string | null>(null);
   
   // Replace the title <Input> in the note branch:
   <WorkAutocompleteInput
       value={form.watch("name") ?? ""}
       onChange={v => form.setValue("name", v)}
       onPickLocal={w => { form.setValue("name", w.name); form.setValue("authorId", w.composer?.id ?? ""); }}
       onPickExternal={async w => {
           setPendingQid(w.wikidataId!);
           const result = await createWorkFromWikidata({
               wikidataId: w.wikidataId!,
               parentId: form.getValues("parentId"),
           });
           if ("conflict" in result) setConflict(result.conflict);
           else { onCreated(result.note); close(); }
       }}
   />
   
   <AuthorConflictDialog
       conflict={conflict}
       onLinkExisting={async candidate => {
           await http.patch(`/api/v1/authors/${candidate.id}`, {
               name: candidate.name,
               extraInformation: candidate.extraInformation ?? "",
               wikidataId: conflict!.incoming.wikidataId,
               birthYear: conflict!.incoming.birthYear,
               deathYear: conflict!.incoming.deathYear,
           });
           const result = await createWorkFromWikidata({
               wikidataId: pendingQid!,
               parentId: form.getValues("parentId"),
           });
           if (!("conflict" in result)) { onCreated(result.note); setConflict(null); close(); }
       }}
       onCreateNew={async () => {
           const result = await createWorkFromWikidata({
               wikidataId: pendingQid!,
               parentId: form.getValues("parentId"),
               forceNewAuthor: true,
           });
           if (!("conflict" in result)) { onCreated(result.note); setConflict(null); close(); }
       }}
       onCancel={() => setConflict(null)}
   />
   ```
   I didn't wire this myself because the form has zod validation, dispatch hooks, OCR scanning, and a "weitere erstellen" checkbox path that all need touching, and I'd rather have you eyeball it in a running browser.

4. **Drop the badge into list views**: in `FolderView.tsx`, `AuthorView.tsx`, etc. add `<WikidataBadge id={note.wikidataId} />` next to the name. Renders nothing when the field is empty, so safe to sprinkle.

5. **End-to-end smoke test** (Phase 8 / Task 35):
   - "Armenian" → external suggests Armenian Dances → pick → note created with composer Alfred Reed + year 1972
   - "Dancing Queen" → external suggests one entry → pick → composer = Andersson or Ulvaeus (P86 first wins)
   - Manually pre-create author "Alfred Reed" with no QID, then search "El Camino Real" Q5347006 → expect 409 → click Verknüpfen → local author gets QID and note is created
   - "Abba Gold" → external probably empty → manual entry path still works
   - Block outbound traffic to `query.wikidata.org` (or temporarily mis-configure the endpoint) → autocomplete still returns local hits, `external: []`

## Caveats / known issues

- **sqlc cannot regenerate** in this repo (older migrations contain MySQL constructs that the dolphin parser rejects: `;;` in `00008_club.sql` — fixed by me — and `SET FOREIGN_KEY_CHECKS` + `ALTER TABLE … CONVERT TO CHARACTER SET …` in `0000015_normalize_collation.sql` — left alone since the migration has already been applied to your prod DB). Future query changes need either hand-written code (like `wikidata_queries.go`) or a fix for `0000015`.
- **Composer/Arranger embedded JOINs** (the original plan had list queries embed both via `sqlc.embed(composer)` + `sqlc.embed(arranger)`) — not implemented. Existing list views still JOIN only via `composer_id_fk` (the renamed column). Arranger shows up on note detail responses but not in list rows. If you want arranger in lists, that's a follow-up hand-written query.
- **The composer field on `models.Note` is still named `Author`**. I considered renaming to `Composer` but it cascades into every consumer in the frontend (`note.author.name` is used in many display sites and OCR-scan logic) and across multiple Go files. Treating "Author = composer" semantically and adding `Arranger` as an additional optional pointer keeps the diff focused.

## Files touched
9 commits, all on `feat/wikidata-autocomplete`. Use `git log --oneline master..HEAD` for the rundown.
