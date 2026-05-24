# Wikidata Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Debounced live autocomplete for works and authors that combines local user data with Wikidata-sourced suggestions, plus a clean composer/arranger split on `elements` and QID-based author deduplication.

**Architecture:** Backend (Go/Fiber/sqlc) gets a new `wikidata` service that queries `https://query.wikidata.org/sparql` server-side, plus a new resolution flow that links works to authors via Wikidata QIDs. The single `elements.author_id_fk` is split into two nullable FKs (`composer_id_fk`, `arranger_id_fk`). Frontend gets autocomplete components for the work/author input fields and a conflict-resolution dialog.

**Tech Stack:** Go 1.x, Fiber v3, sqlc, Goose migrations, MariaDB/MySQL, React + TypeScript on the frontend.

**Spec:** `docs/superpowers/specs/2026-05-24-autocomplete-wikidata-design.md`

---

## Phase Overview

- **Phase 1** — Schema migration + sqlc regeneration (Tasks 1-3)
- **Phase 2** — Domain models, mappers, DTOs (Tasks 4-9)
- **Phase 3** — Service-layer migration to composer/arranger (Tasks 10-13)
- **Phase 4** — Wikidata SPARQL client (Tasks 14-18)
- **Phase 5** — Author-resolution logic (Tasks 19-21)
- **Phase 6** — Autocomplete and from-wikidata endpoints (Tasks 22-27)
- **Phase 7** — Frontend autocomplete + conflict dialog (Tasks 28-34)
- **Phase 8** — Manual verification (Task 35)

After Phase 3 the app is fully working with the new schema (no Wikidata yet — a usable checkpoint). After Phase 6 the backend is feature-complete. After Phase 7 it ships.

---

## Phase 1: Schema Migration

### Task 1: Write migration file

**Files:**
- Create: `api_go/data/sql/migrations/0000016_wikidata_autocomplete.sql`

- [ ] **Step 1: Create the migration**

```sql
-- +goose Up

ALTER TABLE authors
  ADD COLUMN wikidata_id VARCHAR(16) DEFAULT NULL,
  ADD COLUMN birth_year SMALLINT DEFAULT NULL,
  ADD COLUMN death_year SMALLINT DEFAULT NULL,
  ADD UNIQUE KEY uniq_author_wikidata (user_id_fk, wikidata_id);

ALTER TABLE elements
  ADD COLUMN wikidata_id VARCHAR(16) DEFAULT NULL,
  ADD COLUMN composition_year SMALLINT DEFAULT NULL,
  ADD COLUMN genre VARCHAR(255) DEFAULT NULL,
  ADD UNIQUE KEY uniq_element_wikidata (user_id_fk, wikidata_id);

ALTER TABLE elements
  ADD COLUMN composer_id_fk VARCHAR(255) DEFAULT NULL,
  ADD COLUMN arranger_id_fk VARCHAR(255) DEFAULT NULL,
  ADD KEY idx_elements_composer (composer_id_fk),
  ADD KEY idx_elements_arranger (arranger_id_fk),
  ADD CONSTRAINT elements_composer_id_fk FOREIGN KEY (composer_id_fk) REFERENCES authors(id),
  ADD CONSTRAINT elements_arranger_id_fk FOREIGN KEY (arranger_id_fk) REFERENCES authors(id);

UPDATE elements SET composer_id_fk = author_id_fk WHERE author_id_fk IS NOT NULL;

ALTER TABLE elements
  DROP FOREIGN KEY elements_author_id_fk,
  DROP COLUMN author_id_fk;

-- +goose Down

ALTER TABLE elements
  ADD COLUMN author_id_fk VARCHAR(255) DEFAULT NULL,
  ADD CONSTRAINT elements_author_id_fk FOREIGN KEY (author_id_fk) REFERENCES authors(id);

UPDATE elements SET author_id_fk = COALESCE(composer_id_fk, arranger_id_fk);

ALTER TABLE elements
  DROP FOREIGN KEY elements_composer_id_fk,
  DROP FOREIGN KEY elements_arranger_id_fk,
  DROP COLUMN composer_id_fk,
  DROP COLUMN arranger_id_fk,
  DROP COLUMN wikidata_id,
  DROP COLUMN composition_year,
  DROP COLUMN genre;

ALTER TABLE authors
  DROP COLUMN wikidata_id,
  DROP COLUMN birth_year,
  DROP COLUMN death_year;
```

- [ ] **Step 2: Run goose migration against local dev DB**

Run: `cd api_go && goose -dir data/sql/migrations mysql "<connection_string>" up`
Expected: `goose: successfully migrated database to version: 16`

- [ ] **Step 3: Verify the schema in the DB**

Run: `mysql -e "DESCRIBE smartorganizr.elements;" ; mysql -e "DESCRIBE smartorganizr.authors;"`
Expected: `composer_id_fk`, `arranger_id_fk`, `wikidata_id`, `composition_year`, `genre` on elements; `wikidata_id`, `birth_year`, `death_year` on authors. No `author_id_fk` column anymore.

- [ ] **Step 4: Commit**

```bash
git add api_go/data/sql/migrations/0000016_wikidata_autocomplete.sql
git commit -m "feat(db): add wikidata fields and split author into composer/arranger"
```

---

### Task 2: Update query.sql

**Files:**
- Modify: `api_go/data/sql/queries/query.sql`

- [ ] **Step 1: Rewrite author-related queries (CRUD)**

Replace the existing `CreateAuthor` and `UpdateAuthor` queries:

```sql
-- name: CreateAuthor :execlastid
INSERT INTO authors (id, name, extra_information, user_id_fk, wikidata_id, birth_year, death_year)
VALUES (?, ?, ?, ?, ?, ?, ?);

-- name: UpdateAuthor :exec
UPDATE authors
SET name = ?, extra_information = ?, wikidata_id = ?, birth_year = ?, death_year = ?
WHERE id = ? AND user_id_fk = ?;
```

Add new query (paste at end of file):

```sql
-- name: FindAuthorByUserAndWikidataId :one
SELECT * FROM authors WHERE user_id_fk = ? AND wikidata_id = ?;

-- name: FindAuthorsByUserAndExactName :many
SELECT * FROM authors WHERE user_id_fk = ? AND name = ?;

-- name: FindAuthorsByUserAndNameLike :many
SELECT * FROM authors
WHERE user_id_fk = ? AND name LIKE CONCAT('%', ?, '%')
ORDER BY name LIMIT 10;
```

- [ ] **Step 2: Rewrite the JOIN queries that referenced `author_id_fk`**

Find each of these and replace as shown:

`FindAllNotesByAuthor`:

```sql
-- name: FindAllNotesByAuthor :many
SELECT * FROM elements
WHERE type ='note' AND user_id_fk = ?
  AND (composer_id_fk = ? OR arranger_id_fk = ?)
ORDER BY name;
```

`FindAllSubElements`:

```sql
-- name: FindAllSubElements :many
SELECT
  sqlc.embed(elements),
  sqlc.embed(composer),
  sqlc.embed(arranger)
FROM elements
LEFT JOIN authors composer ON elements.composer_id_fk = composer.id
LEFT JOIN authors arranger ON elements.arranger_id_fk = arranger.id
WHERE parent = ? AND elements.user_id_fk = ?
ORDER BY elements.name;
```

`FindAllNotesByCreatorPaged`:

```sql
-- name: FindAllNotesByCreatorPaged :many
SELECT
  sqlc.embed(note),
  sqlc.embed(composer),
  sqlc.embed(arranger),
  sqlc.embed(p)
FROM elements as note
LEFT JOIN authors composer ON note.composer_id_fk = composer.id
LEFT JOIN authors arranger ON note.arranger_id_fk = arranger.id
JOIN elements p ON p.id = note.parent
WHERE note.type ='note' AND note.user_id_fk = ?
ORDER BY note.name LIMIT ? OFFSET ?;
```

`FindAllNotesByCreator`:

```sql
-- name: FindAllNotesByCreator :many
SELECT
  sqlc.embed(note),
  sqlc.embed(composer),
  sqlc.embed(arranger),
  sqlc.embed(p)
FROM elements as note
LEFT JOIN authors composer ON note.composer_id_fk = composer.id
LEFT JOIN authors arranger ON note.arranger_id_fk = arranger.id
JOIN elements p ON p.id = note.parent
WHERE note.type ='note' AND note.user_id_fk = ?
ORDER BY note.name;
```

`FindAllNotesByCreatorPagedWithSearch`:

```sql
-- name: FindAllNotesByCreatorPagedWithSearch :many
SELECT
  sqlc.embed(note),
  sqlc.embed(composer),
  sqlc.embed(arranger),
  sqlc.embed(p)
FROM elements as note
LEFT JOIN authors composer ON note.composer_id_fk = composer.id
LEFT JOIN authors arranger ON note.arranger_id_fk = arranger.id
JOIN elements p ON p.id = note.parent
WHERE note.type ='note'
  AND note.name LIKE CONCAT('%',?,'%')
  AND note.user_id_fk = ?
ORDER BY note.name LIMIT ? OFFSET ?;
```

`FindAllNotesByCreatorWithSearch`:

```sql
-- name: FindAllNotesByCreatorWithSearch :many
SELECT
  sqlc.embed(note),
  sqlc.embed(composer),
  sqlc.embed(arranger),
  sqlc.embed(p)
FROM elements as note
LEFT JOIN authors composer ON note.composer_id_fk = composer.id
LEFT JOIN authors arranger ON note.arranger_id_fk = arranger.id
JOIN elements p ON p.id = note.parent
WHERE note.type ='note'
  AND note.name LIKE CONCAT('%',?,'%')
  AND note.user_id_fk = ?
ORDER BY note.name;
```

- [ ] **Step 3: Add new note/element query for from-wikidata flow**

Append at the end:

```sql
-- name: FindElementsByUserAndNameLike :many
SELECT * FROM elements
WHERE user_id_fk = ? AND type = 'note' AND name LIKE CONCAT('%', ?, '%')
ORDER BY name LIMIT 10;

-- name: CreateNoteWithWikidata :execlastid
INSERT INTO elements (
  type, id, creation_date, description, name, number_of_pages,
  user_id_fk, parent, composer_id_fk, arranger_id_fk,
  wikidata_id, composition_year, genre
) VALUES (
  'note', ?, NOW(), ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?
);
```

- [ ] **Step 4: Search for any remaining `author_id_fk` reference**

Run via Grep tool: pattern `author_id_fk` in `api_go/data/sql/queries/query.sql`
Expected: zero matches.

If any remain, replace them with `composer_id_fk` / `arranger_id_fk` per their context.

- [ ] **Step 5: Commit**

```bash
git add api_go/data/sql/queries/query.sql
git commit -m "feat(db): update queries for composer/arranger split and wikidata fields"
```

---

### Task 3: Regenerate sqlc

**Files:**
- Auto-generated: `api_go/db/query.sql.go`, `api_go/db/models.go`

- [ ] **Step 1: Run sqlc generate**

Run: `cd api_go && sqlc generate`
Expected: no errors, files regenerated.

- [ ] **Step 2: Verify new types in models.go**

Open `api_go/db/models.go` and confirm:
- `Author` struct has `WikidataID sql.NullString`, `BirthYear sql.NullInt16`, `DeathYear sql.NullInt16`
- `Element` struct has `ComposerIDFk sql.NullString`, `ArrangerIDFk sql.NullString`, `WikidataID sql.NullString`, `CompositionYear sql.NullInt16`, `Genre sql.NullString`
- `Element` no longer has `AuthorIDFk`

- [ ] **Step 3: Try to build — expect compile errors**

Run: `cd api_go && go build ./...`
Expected: FAIL with errors about missing field `AuthorIDFk` in various services/mappers. These are the call-sites we fix in Phases 2–3.

- [ ] **Step 4: Commit regenerated sqlc output**

```bash
git add api_go/db/query.sql.go api_go/db/models.go
git commit -m "chore(db): regenerate sqlc from updated queries"
```

---

## Phase 2: Domain Models, Mappers, DTOs

### Task 4: Extend `models.Author`

**Files:**
- Modify: `api_go/models/Author.go`

- [ ] **Step 1: Add new fields**

Replace the file contents:

```go
package models

type Author struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	ExtraInformation string `json:"extraInformation"`
	WikidataID       string `json:"wikidataId,omitempty"`
	BirthYear        *int16 `json:"birthYear,omitempty"`
	DeathYear        *int16 `json:"deathYear,omitempty"`
	User             User   `json:"user"`
}
```

- [ ] **Step 2: Commit**

```bash
git add api_go/models/Author.go
git commit -m "feat(models): extend Author with wikidata fields"
```

---

### Task 5: Update `models.Note` to use Composer + Arranger

**Files:**
- Modify: `api_go/models/Note.go`

- [ ] **Step 1: Replace single Author with Composer + Arranger pointers**

Replace the file contents:

```go
package models

import (
	"time"
)

type Note struct {
	Composer        *Author   `json:"composer,omitempty"`
	Arranger        *Author   `json:"arranger,omitempty"`
	NumberOfPages   int       `json:"numberOfPages"`
	PdfAvailable    bool      `json:"pdfAvailable"`
	PDFContent      []byte    `json:"pdfContent"`
	CreationDate    time.Time `json:"creationDate"`
	Id              string    `json:"id"`
	Name            string    `json:"name"`
	Parent          *Folder   `json:"parent"`
	Description     string    `json:"description"`
	Creator         User      `json:"creator"`
	WikidataID      string    `json:"wikidataId,omitempty"`
	CompositionYear *int16    `json:"compositionYear,omitempty"`
	Genre           string    `json:"genre,omitempty"`
}

func (note Note) Type() ElementName {
	return NOTE
}

func (note Note) Compare(other Note) bool {
	return other.Id == note.Id
}

func (note Note) String() string {
	composerName := ""
	if note.Composer != nil {
		composerName = note.Composer.Name
	}
	arrangerName := ""
	if note.Arranger != nil {
		arrangerName = note.Arranger.Name
	}
	return "\nTitel:\t" + note.Name +
		"\n" + "Beschreibung\t" + note.Description +
		"\n" + "Enthaltende Ordner:\t" + note.Parent.Name +
		"\n" + "Komponist:\t" + composerName +
		"\n" + "Arrangeur:\t" + arrangerName
}

var _ Element = Note{}
```

- [ ] **Step 2: Build will still fail elsewhere — that's expected**

Run: `cd api_go && go build ./...`
Expected: errors about `note.Author` references in mappers/services. Continue.

- [ ] **Step 3: Commit**

```bash
git add api_go/models/Note.go
git commit -m "feat(models): replace Note.Author with Composer + Arranger pointers"
```

---

### Task 6: Update `AuthorMapper`

**Files:**
- Modify: `api_go/mappers/AuthorMapper.go`

- [ ] **Step 1: Map new fields**

Replace the file contents:

```go
package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertAuthorFromEntity(entity db.Author) models.Author {
	a := models.Author{
		ID:               entity.ID,
		ExtraInformation: entity.ExtraInformation.String,
		Name:             entity.Name.String,
		WikidataID:       entity.WikidataID.String,
	}
	if entity.BirthYear.Valid {
		v := entity.BirthYear.Int16
		a.BirthYear = &v
	}
	if entity.DeathYear.Valid {
		v := entity.DeathYear.Int16
		a.DeathYear = &v
	}
	return a
}

func ConvertAuthorFromEntityPtr(entity *db.Author) *models.Author {
	if entity == nil || !entity.ID.Valid {
		return nil
	}
	a := ConvertAuthorFromEntity(*entity)
	return &a
}
```

NOTE: `db.Author.ID` is `string` (not `sql.NullString`). If sqlc generated the JOIN-author embed differently (e.g. with a different struct or a `Valid` field), adapt this helper after looking at the regenerated `db.models.go`. The intent: when the joined author is the NULL side of a LEFT JOIN, return `nil`.

- [ ] **Step 2: Commit**

```bash
git add api_go/mappers/AuthorMapper.go
git commit -m "feat(mappers): map new wikidata fields in AuthorMapper"
```

---

### Task 7: Update `NoteMapper`

**Files:**
- Modify: `api_go/mappers/NoteMapper.go`

- [ ] **Step 1: Replace single-author mapping with composer/arranger**

Replace the file contents:

```go
package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertNoteFromEntity(entity db.Note, user models.User, composer *models.Author, arranger *models.Author, parent *db.Folder) models.Note {
	var parentFolder *models.Folder
	if parent != nil {
		parentFolderDto := ConvertFolderFromEntity(*parent, user)
		parentFolder = &parentFolderDto
	}
	return convertNote(entity, user, composer, arranger, parentFolder)
}

func convertNote(entity db.Note, user models.User, composer *models.Author, arranger *models.Author, parentFolder *models.Folder) models.Note {
	n := models.Note{
		Id:            entity.GetId(),
		CreationDate:  entity.GetCreationDate(),
		Creator:       user,
		Description:   entity.GetDescription(),
		Name:          entity.GetName(),
		Composer:      composer,
		Arranger:      arranger,
		NumberOfPages: int(entity.NumberOfPages.Int32),
		PdfAvailable:  entity.PdfAvailable,
		PDFContent:    entity.PdfContent,
		Parent:        parentFolder,
		WikidataID:    entity.WikidataID.String,
		Genre:         entity.Genre.String,
	}
	if entity.CompositionYear.Valid {
		v := entity.CompositionYear.Int16
		n.CompositionYear = &v
	}
	return n
}

func ConvertNoteFromEntityWithFolderModel(entity db.Note, user models.User, composer *models.Author, arranger *models.Author, parent *models.Folder) models.Note {
	return convertNote(entity, user, composer, arranger, parent)
}
```

- [ ] **Step 2: Commit**

```bash
git add api_go/mappers/NoteMapper.go
git commit -m "feat(mappers): split Note author into composer + arranger"
```

---

### Task 8: Extend `Author` and `Note` DTOs

**Files:**
- Modify: `api_go/controllers/dto/Author.go`
- Modify: `api_go/controllers/dto/AuthorCreateDto.go`
- Modify: `api_go/controllers/dto/Note.go`
- Modify: `api_go/controllers/dto/NotePostDto.go`

- [ ] **Step 1: Read each DTO file first to see current structure**

Use Read tool on each file before editing.

- [ ] **Step 2: Add wikidata fields to `Author` DTO**

In `dto/Author.go`, add inside the struct (preserve existing tags):

```go
WikidataID string `json:"wikidataId,omitempty"`
BirthYear  *int16 `json:"birthYear,omitempty"`
DeathYear  *int16 `json:"deathYear,omitempty"`
```

- [ ] **Step 3: Add wikidata fields to `AuthorCreateDto`**

Same three fields as above.

- [ ] **Step 4: Replace `Author` field in Note DTO with `Composer` + `Arranger`**

In `dto/Note.go`, find the `Author dto.Author` field and replace with:

```go
Composer        *Author `json:"composer,omitempty"`
Arranger        *Author `json:"arranger,omitempty"`
WikidataID      string  `json:"wikidataId,omitempty"`
CompositionYear *int16  `json:"compositionYear,omitempty"`
Genre           string  `json:"genre,omitempty"`
```

- [ ] **Step 5: Update `NotePostDto`**

In `dto/NotePostDto.go`, replace any `AuthorID string` (or similar) field with:

```go
ComposerID      string `json:"composerId,omitempty"`
ArrangerID      string `json:"arrangerId,omitempty"`
WikidataID      string `json:"wikidataId,omitempty"`
CompositionYear *int16 `json:"compositionYear,omitempty"`
Genre           string `json:"genre,omitempty"`
```

- [ ] **Step 6: Commit**

```bash
git add api_go/controllers/dto/Author.go api_go/controllers/dto/AuthorCreateDto.go api_go/controllers/dto/Note.go api_go/controllers/dto/NotePostDto.go
git commit -m "feat(dto): add wikidata + composer/arranger fields"
```

---

### Task 9: Update `ConvertNoteDtoFromModel` and `AuthorDtoMapper`

**Files:**
- Modify: `api_go/mappers/AuthorDtoMapper.go`
- Modify: `api_go/mappers/ConvertNoteDtoFromModel.go`

- [ ] **Step 1: Read both files first**

Use Read tool.

- [ ] **Step 2: In `AuthorDtoMapper.go`, map the three new fields**

Within the existing `ConvertAuthorDtoFromModel` body, add:

```go
WikidataID: author.WikidataID,
BirthYear:  author.BirthYear,
DeathYear:  author.DeathYear,
```

- [ ] **Step 3: In `ConvertNoteDtoFromModel.go`, replace `Author:` with composer/arranger**

Old (single author): `Author: mappers.ConvertAuthorDtoFromModel(note.Author),`

New:

```go
Composer:        nil,
Arranger:        nil,
WikidataID:      note.WikidataID,
CompositionYear: note.CompositionYear,
Genre:           note.Genre,
```

Then after the struct literal, add:

```go
if note.Composer != nil {
	c := ConvertAuthorDtoFromModel(*note.Composer)
	dto.Composer = &c
}
if note.Arranger != nil {
	a := ConvertAuthorDtoFromModel(*note.Arranger)
	dto.Arranger = &a
}
```

(Variable name `dto` may differ — match what's already in the function.)

- [ ] **Step 4: Commit**

```bash
git add api_go/mappers/AuthorDtoMapper.go api_go/mappers/ConvertNoteDtoFromModel.go
git commit -m "feat(mappers): DTO conversion for composer/arranger and wikidata"
```

---

## Phase 3: Service-Layer Migration

### Task 10: Fix `AuthorService.CreateAuthor` and `UpdateAuthor`

**Files:**
- Modify: `api_go/service/authorService.go`

- [ ] **Step 1: Update CreateAuthor signature in DTO conversion**

In `CreateAuthor`, change the `db.CreateAuthorParams` literal to:

```go
var _, err = a.Queries.CreateAuthor(context.Background(), db.CreateAuthorParams{
	ID:               authorId.String(),
	Name:             db.NewSQLNullString(author.Name),
	ExtraInformation: db.NewSQLNullString(author.ExtraInformation),
	UserIDFk:         db.NewSQLNullString(userId),
	WikidataID:       db.NewSQLNullString(author.WikidataID),
	BirthYear:        toNullInt16(author.BirthYear),
	DeathYear:        toNullInt16(author.DeathYear),
})
```

- [ ] **Step 2: Add helper `toNullInt16`**

Add at the bottom of `authorService.go`:

```go
func toNullInt16(v *int16) sql.NullInt16 {
	if v == nil {
		return sql.NullInt16{}
	}
	return sql.NullInt16{Int16: *v, Valid: true}
}
```

- [ ] **Step 3: Update UpdateAuthor params likewise**

In `UpdateAuthor`, change the `db.UpdateAuthorParams` literal to:

```go
err := a.Queries.UpdateAuthor(context.Background(), db.UpdateAuthorParams{
	ID:               authorId,
	Name:             db.NewSQLNullString(authorPatchDto.Name),
	ExtraInformation: db.NewSQLNullString(authorPatchDto.ExtraInformation),
	WikidataID:       db.NewSQLNullString(authorPatchDto.WikidataID),
	BirthYear:        toNullInt16(authorPatchDto.BirthYear),
	DeathYear:        toNullInt16(authorPatchDto.DeathYear),
	UserIDFk:         db.NewSQLNullString(userId),
})
```

Note: `AuthorPatchDto` may not have these fields yet — if not, add them to `api_go/controllers/dto/AuthorPatchDto` analogously to Task 8.

- [ ] **Step 4: Fix `FindAllNotesByAuthor`**

The sqlc-generated `FindAllNotesByAuthorParams` no longer has `AuthorIDFk` — it now takes the author ID twice (once for composer, once for arranger match). Update:

```go
func (a *AuthorService) FindAllNotesByAuthor(userId string, authorId string) (*[]models.Note, error) {
	notes, err := a.Queries.FindAllNotesByAuthor(context.Background(), db.FindAllNotesByAuthorParams{
		UserIDFk:     db.NewSQLNullString(userId),
		ComposerIDFk: db.NewSQLNullString(authorId),
		ArrangerIDFk: db.NewSQLNullString(authorId),
	})
	// rest of function: when calling mappers.ConvertNoteFromEntity, pass composer and arranger
	// (look them up from the row — see Step 5)
```

Exact param names depend on what sqlc generated. If the regenerated `FindAllNotesByAuthorParams` uses different names, match those.

- [ ] **Step 5: Adjust the note-mapping inside FindAllNotesByAuthor**

In that function, where it currently does `mappers.ConvertNoteFromEntity(convertedNote, *user, author, nil)`, you need to provide composer + arranger. Since this query returns notes where the *same* author is either composer or arranger, look up the second side by ID for each note:

```go
var modelAuthors = make([]models.Note, 0)
for _, note := range notes {
	convertedNote := db.ConvertNoteEntityToDBVersion(note)
	var composer, arranger *models.Author
	if convertedNote.ComposerIDFk.Valid && convertedNote.ComposerIDFk.String == authorId {
		composer = &author
	} else if convertedNote.ComposerIDFk.Valid {
		c, err := a.FindAuthorByIdAndUser(convertedNote.ComposerIDFk.String, userId)
		if err == nil {
			composer = &c
		}
	}
	if convertedNote.ArrangerIDFk.Valid && convertedNote.ArrangerIDFk.String == authorId {
		arranger = &author
	} else if convertedNote.ArrangerIDFk.Valid {
		ar, err := a.FindAuthorByIdAndUser(convertedNote.ArrangerIDFk.String, userId)
		if err == nil {
			arranger = &ar
		}
	}
	noteModel := mappers.ConvertNoteFromEntity(convertedNote, *user, composer, arranger, nil)
	modelAuthors = append(modelAuthors, noteModel)
}
```

(N+1 query — acceptable for an author detail page, optimize later if needed.)

- [ ] **Step 6: Build**

Run: `cd api_go && go build ./...`
Expected: errors now move to `noteService.go`, `folderService.go` etc. (Task 11).

- [ ] **Step 7: Commit**

```bash
git add api_go/service/authorService.go api_go/controllers/dto/AuthorPatchDto.go
git commit -m "feat(service): pass new author fields through AuthorService"
```

---

### Task 11: Fix `NoteService`

**Files:**
- Modify: `api_go/service/noteService.go`

- [ ] **Step 1: Read the file first**

Use Read tool — this file is large; understand the call-sites for `author_id_fk` and `note.Author`.

- [ ] **Step 2: For every place that wrote `AuthorIDFk` into a CreateNote-style params struct**

Replace with one or both of `ComposerIDFk` and `ArrangerIDFk` depending on what fields the DTO carries (`ComposerID` and `ArrangerID` from Task 8).

Example:

```go
// before:
AuthorIDFk: db.NewSQLNullString(notePostDto.AuthorID),

// after:
ComposerIDFk: db.NewSQLNullString(notePostDto.ComposerID),
ArrangerIDFk: db.NewSQLNullString(notePostDto.ArrangerID),
```

- [ ] **Step 3: For every JOIN-result mapping that used `author` directly**

For queries that now return `composer` and `arranger` LEFT-JOIN-embedded structs (Task 2), build pointers:

```go
var composer *models.Author
if row.Composer.ID != "" {  // adjust check based on what sqlc generated
	c := mappers.ConvertAuthorFromEntity(row.Composer)
	composer = &c
}
var arranger *models.Author
if row.Arranger.ID != "" {
	ar := mappers.ConvertAuthorFromEntity(row.Arranger)
	arranger = &ar
}
note := mappers.ConvertNoteFromEntity(row.Note, user, composer, arranger, &row.P)
```

The exact NULL-check depends on what sqlc generated for `sqlc.embed(composer)` with a LEFT JOIN — usually a struct whose fields are all NULL sentinels. Verify by reading the regenerated `db.FindAllNotesByCreatorRow` etc.

- [ ] **Step 4: Build**

Run: `cd api_go && go build ./...`
Expected: errors move to `folderService.go` / controllers.

- [ ] **Step 5: Commit**

```bash
git add api_go/service/noteService.go
git commit -m "feat(service): NoteService passes composer + arranger"
```

---

### Task 12: Fix remaining services & controllers

**Files:**
- Modify: `api_go/service/folderService.go` (and any service that touched `AuthorIDFk` or `note.Author`)
- Modify: `api_go/controllers/elements.go` (and any controller that did the same)

- [ ] **Step 1: Use Grep to find every remaining reference**

Use Grep tool: pattern `AuthorIDFk|\.Author\b` in `api_go/`. Excludes the `Author` type itself and intentional uses.

- [ ] **Step 2: For each hit, update analogously to Task 11**

If the call-site **only** read the author for display, replace with composer (most cases). If it dealt with note creation, use both composer + arranger from the DTO.

- [ ] **Step 3: Build**

Run: `cd api_go && go build ./...`
Expected: clean build.

- [ ] **Step 4: Run existing tests**

Run: `cd api_go && go test ./...`
Expected: all green. If a mapper test (e.g. `EventMapper_test.go`) fails because of unrelated breakage, fix it. If a Note-related test fails because it constructed `models.Note{Author: ...}`, update it to `Composer: &someAuthor`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete composer/arranger migration across services and controllers"
```

**Checkpoint:** After this commit, the app works end-to-end with the new schema. No Wikidata yet, but the composer/arranger split is live and stable. This is a safe place to pause.

---

### Task 13: Frontend stop-gap for composer/arranger

**Files:**
- Modify: `ui/src/models/` — find the Note / Element TypeScript model
- Modify: any component that accessed `note.author` (use Grep)

- [ ] **Step 1: Grep for `\.author\b` in ui/src**

Use Grep tool. List the hits.

- [ ] **Step 2: Update the Note TypeScript model**

Add `composer?: Author` and `arranger?: Author` to the Note interface; remove `author: Author` if present (or keep it temporarily as deprecated alias if too many usages — but better to bite the bullet and rename).

- [ ] **Step 3: Update display sites**

For each usage of `note.author.name`, change to `note.composer?.name ?? note.arranger?.name ?? ""`. For create/edit forms, replace the single author dropdown with two side-by-side dropdowns (Composer / Arrangeur). Same `AuthorSearchBar.tsx` component, used twice.

- [ ] **Step 4: Type-check**

Run: `cd ui && npm run typecheck` (or whatever the project script is — check `package.json`)
Expected: clean.

- [ ] **Step 5: Manual smoke**

Start the dev server, create a Note with Composer set and Arranger empty. Verify it saves. Repeat with Arranger only. Repeat with both.

- [ ] **Step 6: Commit**

```bash
git add ui/
git commit -m "feat(ui): split note author into composer + arranger fields"
```

---

## Phase 4: Wikidata SPARQL Client

### Task 14: Wikidata service skeleton + test scaffold

**Files:**
- Create: `api_go/service/wikidataService.go`
- Create: `api_go/service/wikidataService_test.go`

- [ ] **Step 1: Write the failing test**

```go
package service

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWikidataService_SearchWorks_ParsesResult(t *testing.T) {
	mockResp := `{
	  "results": {
	    "bindings": [
	      {
	        "work": {"value": "http://www.wikidata.org/entity/Q4791234"},
	        "workLabel": {"value": "Armenian Dances"},
	        "workDescription": {"value": "suite for concert band by Alfred Reed"},
	        "composer": {"value": "http://www.wikidata.org/entity/Q371953"},
	        "composerLabel": {"value": "Alfred Reed"},
	        "year": {"value": "1972"}
	      }
	    ]
	  }
	}`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/sparql-results+json")
		w.Write([]byte(mockResp))
	}))
	defer srv.Close()

	wd := NewWikidataService(srv.URL, "TestAgent/1.0")
	works, err := wd.SearchWorks("Armenian")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(works) != 1 {
		t.Fatalf("expected 1 work, got %d", len(works))
	}
	if works[0].WikidataID != "Q4791234" {
		t.Errorf("expected QID Q4791234, got %s", works[0].WikidataID)
	}
	if works[0].Name != "Armenian Dances" {
		t.Errorf("expected name 'Armenian Dances', got %s", works[0].Name)
	}
	if works[0].Composer == nil || works[0].Composer.WikidataID != "Q371953" {
		t.Errorf("expected composer Q371953, got %+v", works[0].Composer)
	}
	if works[0].Year == nil || *works[0].Year != 1972 {
		t.Errorf("expected year 1972, got %+v", works[0].Year)
	}
}
```

- [ ] **Step 2: Run test — expect compile failure**

Run: `cd api_go && go test ./service/ -run TestWikidataService_SearchWorks_ParsesResult -v`
Expected: FAIL with "undefined: NewWikidataService"

- [ ] **Step 3: Write minimal implementation**

```go
package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type WikidataAuthor struct {
	WikidataID  string `json:"wikidataId"`
	Name        string `json:"name"`
	Description string `json:"description"`
	BirthYear   *int16 `json:"birthYear,omitempty"`
	DeathYear   *int16 `json:"deathYear,omitempty"`
}

type WikidataWork struct {
	WikidataID  string          `json:"wikidataId"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Composer    *WikidataAuthor `json:"composer,omitempty"`
	Year        *int16          `json:"year,omitempty"`
	Genre       string          `json:"genre,omitempty"`
}

type WikidataService struct {
	Endpoint  string
	UserAgent string
	Client    *http.Client
}

func NewWikidataService(endpoint, userAgent string) *WikidataService {
	return &WikidataService{
		Endpoint:  endpoint,
		UserAgent: userAgent,
		Client:    &http.Client{Timeout: 10 * time.Second},
	}
}

type sparqlResponse struct {
	Results struct {
		Bindings []map[string]sparqlBinding `json:"bindings"`
	} `json:"results"`
}

type sparqlBinding struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

func (s *WikidataService) runQuery(sparql string) (*sparqlResponse, error) {
	form := url.Values{}
	form.Set("query", sparql)
	form.Set("format", "json")
	req, err := http.NewRequest("POST", s.Endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/sparql-results+json")
	req.Header.Set("User-Agent", s.UserAgent)
	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("wikidata returned %d: %s", resp.StatusCode, string(body))
	}
	var parsed sparqlResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	return &parsed, nil
}

func qidFromURI(uri string) string {
	idx := strings.LastIndex(uri, "/")
	if idx < 0 {
		return uri
	}
	return uri[idx+1:]
}

func parseYear(s string) *int16 {
	if s == "" {
		return nil
	}
	year, err := strconv.Atoi(s)
	if err != nil {
		return nil
	}
	y := int16(year)
	return &y
}

func (s *WikidataService) SearchWorks(term string) ([]WikidataWork, error) {
	sparql := `SELECT ?work ?workLabel ?workDescription ?composer ?composerLabel ?year WHERE {
	  ?work rdfs:label|skos:altLabel ?label .
	  FILTER(CONTAINS(LCASE(?label), LCASE("` + sanitizeTerm(term) + `"))) .
	  ?work wdt:P31/wdt:P279* wd:Q2188189 .
	  OPTIONAL { ?work wdt:P86 ?composer . }
	  OPTIONAL { ?work wdt:P571 ?inception . BIND(YEAR(?inception) AS ?inceptionYear) }
	  OPTIONAL { ?work wdt:P577 ?pubDate . BIND(YEAR(?pubDate) AS ?pubYear) }
	  BIND(COALESCE(?inceptionYear, ?pubYear) AS ?year)
	  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en" . }
	} LIMIT 10`

	resp, err := s.runQuery(sparql)
	if err != nil {
		return nil, err
	}
	var works []WikidataWork
	for _, row := range resp.Results.Bindings {
		work := WikidataWork{
			WikidataID:  qidFromURI(row["work"].Value),
			Name:        row["workLabel"].Value,
			Description: row["workDescription"].Value,
			Year:        parseYear(row["year"].Value),
		}
		if c, ok := row["composer"]; ok && c.Value != "" {
			work.Composer = &WikidataAuthor{
				WikidataID: qidFromURI(c.Value),
				Name:       row["composerLabel"].Value,
			}
		}
		works = append(works, work)
	}
	return works, nil
}

func sanitizeTerm(t string) string {
	return strings.ReplaceAll(strings.ReplaceAll(t, `"`, ""), `\`, "")
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `cd api_go && go test ./service/ -run TestWikidataService_SearchWorks_ParsesResult -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api_go/service/wikidataService.go api_go/service/wikidataService_test.go
git commit -m "feat(service): wikidata SearchWorks with SPARQL client"
```

---

### Task 15: `SearchAuthors`

**Files:**
- Modify: `api_go/service/wikidataService.go`
- Modify: `api_go/service/wikidataService_test.go`

- [ ] **Step 1: Add test**

Append to test file:

```go
func TestWikidataService_SearchAuthors_ParsesResult(t *testing.T) {
	mockResp := `{
	  "results": {
	    "bindings": [
	      {
	        "person": {"value": "http://www.wikidata.org/entity/Q371953"},
	        "personLabel": {"value": "Alfred Reed"},
	        "personDescription": {"value": "American composer (1921–2005)"},
	        "birth": {"value": "1921-01-25T00:00:00Z"},
	        "death": {"value": "2005-09-17T00:00:00Z"}
	      }
	    ]
	  }
	}`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(mockResp))
	}))
	defer srv.Close()

	wd := NewWikidataService(srv.URL, "TestAgent/1.0")
	authors, err := wd.SearchAuthors("Reed")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(authors) != 1 {
		t.Fatalf("expected 1 author, got %d", len(authors))
	}
	if authors[0].WikidataID != "Q371953" {
		t.Errorf("expected Q371953, got %s", authors[0].WikidataID)
	}
	if authors[0].BirthYear == nil || *authors[0].BirthYear != 1921 {
		t.Errorf("expected birth 1921, got %+v", authors[0].BirthYear)
	}
	if authors[0].DeathYear == nil || *authors[0].DeathYear != 2005 {
		t.Errorf("expected death 2005, got %+v", authors[0].DeathYear)
	}
}
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd api_go && go test ./service/ -run TestWikidataService_SearchAuthors_ParsesResult -v`
Expected: FAIL "undefined: SearchAuthors"

- [ ] **Step 3: Implement `SearchAuthors`**

Add to `wikidataService.go`:

```go
func parseYearFromISO(s string) *int16 {
	if len(s) < 4 {
		return nil
	}
	return parseYear(s[:4])
}

func (s *WikidataService) SearchAuthors(term string) ([]WikidataAuthor, error) {
	sparql := `SELECT ?person ?personLabel ?personDescription ?birth ?death WHERE {
	  ?person rdfs:label|skos:altLabel ?label .
	  FILTER(CONTAINS(LCASE(?label), LCASE("` + sanitizeTerm(term) + `"))) .
	  ?person wdt:P106 ?occupation .
	  VALUES ?occupation { wd:Q36834 wd:Q486748 wd:Q488205 }
	  OPTIONAL { ?person wdt:P569 ?birth . }
	  OPTIONAL { ?person wdt:P570 ?death . }
	  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en" . }
	} LIMIT 10`

	resp, err := s.runQuery(sparql)
	if err != nil {
		return nil, err
	}
	var authors []WikidataAuthor
	for _, row := range resp.Results.Bindings {
		a := WikidataAuthor{
			WikidataID:  qidFromURI(row["person"].Value),
			Name:        row["personLabel"].Value,
			Description: row["personDescription"].Value,
			BirthYear:   parseYearFromISO(row["birth"].Value),
			DeathYear:   parseYearFromISO(row["death"].Value),
		}
		authors = append(authors, a)
	}
	return authors, nil
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `cd api_go && go test ./service/ -run TestWikidataService_SearchAuthors -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api_go/service/wikidataService.go api_go/service/wikidataService_test.go
git commit -m "feat(service): wikidata SearchAuthors"
```

---

### Task 16: `GetWorkDetail`

**Files:**
- Modify: `api_go/service/wikidataService.go`
- Modify: `api_go/service/wikidataService_test.go`

- [ ] **Step 1: Add test**

```go
func TestWikidataService_GetWorkDetail_PrefersComposerOverPerformer(t *testing.T) {
	mockResp := `{
	  "results": {
	    "bindings": [
	      {
	        "workLabel": {"value": "Dancing Queen"},
	        "workDescription": {"value": "ABBA song"},
	        "composer": {"value": "http://www.wikidata.org/entity/Q205721"},
	        "composerLabel": {"value": "Benny Andersson"},
	        "year": {"value": "1976"}
	      }
	    ]
	  }
	}`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(mockResp))
	}))
	defer srv.Close()

	wd := NewWikidataService(srv.URL, "TestAgent/1.0")
	work, err := wd.GetWorkDetail("Q204195")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if work.Name != "Dancing Queen" {
		t.Errorf("expected 'Dancing Queen', got %s", work.Name)
	}
	if work.Composer == nil || work.Composer.WikidataID != "Q205721" {
		t.Errorf("expected composer Q205721, got %+v", work.Composer)
	}
}
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd api_go && go test ./service/ -run TestWikidataService_GetWorkDetail -v`
Expected: FAIL "undefined: GetWorkDetail"

- [ ] **Step 3: Implement `GetWorkDetail`**

```go
func (s *WikidataService) GetWorkDetail(qid string) (*WikidataWork, error) {
	sparql := `SELECT ?workLabel ?workDescription ?composer ?composerLabel ?author ?authorLabel ?performer ?performerLabel ?year ?genreLabel WHERE {
	  BIND(wd:` + qid + ` AS ?work)
	  OPTIONAL { ?work wdt:P86 ?composer . }
	  OPTIONAL { ?work wdt:P50 ?author . }
	  OPTIONAL { ?work wdt:P175 ?performer . }
	  OPTIONAL { ?work wdt:P571 ?inception . BIND(YEAR(?inception) AS ?inceptionYear) }
	  OPTIONAL { ?work wdt:P577 ?pubDate . BIND(YEAR(?pubDate) AS ?pubYear) }
	  BIND(COALESCE(?inceptionYear, ?pubYear) AS ?year)
	  OPTIONAL { ?work wdt:P136 ?genre . }
	  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en" . }
	} LIMIT 1`

	resp, err := s.runQuery(sparql)
	if err != nil {
		return nil, err
	}
	if len(resp.Results.Bindings) == 0 {
		return nil, fmt.Errorf("work %s not found in wikidata", qid)
	}
	row := resp.Results.Bindings[0]
	work := &WikidataWork{
		WikidataID:  qid,
		Name:        row["workLabel"].Value,
		Description: row["workDescription"].Value,
		Year:        parseYear(row["year"].Value),
		Genre:       row["genreLabel"].Value,
	}
	// composer (P86) > author (P50) > performer (P175)
	for _, key := range []string{"composer", "author", "performer"} {
		if v, ok := row[key]; ok && v.Value != "" {
			work.Composer = &WikidataAuthor{
				WikidataID: qidFromURI(v.Value),
				Name:       row[key+"Label"].Value,
			}
			break
		}
	}
	return work, nil
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `cd api_go && go test ./service/ -run TestWikidataService_GetWorkDetail -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api_go/service/wikidataService.go api_go/service/wikidataService_test.go
git commit -m "feat(service): wikidata GetWorkDetail with composer fallback chain"
```

---

### Task 17: Get author detail (lookup by QID)

**Files:**
- Modify: `api_go/service/wikidataService.go`
- Modify: `api_go/service/wikidataService_test.go`

- [ ] **Step 1: Add test**

```go
func TestWikidataService_GetAuthorDetail(t *testing.T) {
	mockResp := `{
	  "results": {
	    "bindings": [
	      {
	        "personLabel": {"value": "Alfred Reed"},
	        "personDescription": {"value": "American composer"},
	        "birth": {"value": "1921-01-25T00:00:00Z"},
	        "death": {"value": "2005-09-17T00:00:00Z"}
	      }
	    ]
	  }
	}`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(mockResp))
	}))
	defer srv.Close()

	wd := NewWikidataService(srv.URL, "TestAgent/1.0")
	a, err := wd.GetAuthorDetail("Q371953")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.WikidataID != "Q371953" {
		t.Errorf("expected Q371953, got %s", a.WikidataID)
	}
	if a.BirthYear == nil || *a.BirthYear != 1921 {
		t.Errorf("expected birth 1921, got %+v", a.BirthYear)
	}
}
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd api_go && go test ./service/ -run TestWikidataService_GetAuthorDetail -v`
Expected: FAIL

- [ ] **Step 3: Implement**

```go
func (s *WikidataService) GetAuthorDetail(qid string) (*WikidataAuthor, error) {
	sparql := `SELECT ?personLabel ?personDescription ?birth ?death WHERE {
	  BIND(wd:` + qid + ` AS ?person)
	  OPTIONAL { ?person wdt:P569 ?birth . }
	  OPTIONAL { ?person wdt:P570 ?death . }
	  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en" . }
	} LIMIT 1`

	resp, err := s.runQuery(sparql)
	if err != nil {
		return nil, err
	}
	if len(resp.Results.Bindings) == 0 {
		return nil, fmt.Errorf("author %s not found in wikidata", qid)
	}
	row := resp.Results.Bindings[0]
	return &WikidataAuthor{
		WikidataID:  qid,
		Name:        row["personLabel"].Value,
		Description: row["personDescription"].Value,
		BirthYear:   parseYearFromISO(row["birth"].Value),
		DeathYear:   parseYearFromISO(row["death"].Value),
	}, nil
}
```

- [ ] **Step 4: Test passes, commit**

Run: `cd api_go && go test ./service/ -run TestWikidataService -v`
Expected: all four tests PASS.

```bash
git add api_go/service/wikidataService.go api_go/service/wikidataService_test.go
git commit -m "feat(service): wikidata GetAuthorDetail"
```

---

### Task 18: Wire WikidataService into router

**Files:**
- Modify: `api_go/routers/setupRouter.go`
- Modify: `api_go/constants/` — add a new key constant
- Modify: `api_go/config/` — add a wikidata user agent config (optional, sensible default)

- [ ] **Step 1: Add constant**

In the constants package, add:

```go
const WikidataService = "wikidataService"
```

- [ ] **Step 2: Instantiate in setupRouter**

After the other service instantiations, add:

```go
var wikidataService = service.NewWikidataService(
	"https://query.wikidata.org/sparql",
	"SmartOrganizr/1.0 (https://github.com/SamTV12345/SmartOrganizr)",
)
```

(If a Wikidata endpoint override exists in config, use it; otherwise hardcode is fine — this is a stable URL.)

- [ ] **Step 3: SetLocal in the request middleware**

In the same `app.Use` block that sets other services:

```go
SetLocal[*service.WikidataService](c, constants.WikidataService, wikidataService)
```

- [ ] **Step 4: Build**

Run: `cd api_go && go build ./...`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add api_go/routers/setupRouter.go api_go/constants/
git commit -m "feat(router): wire WikidataService into the request context"
```

---

## Phase 5: Author Resolution Logic

### Task 19: Test author resolution — QID match path

**Files:**
- Create: `api_go/service/authorResolution.go`
- Create: `api_go/service/authorResolution_test.go`

- [ ] **Step 1: Write the failing test**

```go
package service

import (
	"testing"
)

func TestResolveAuthor_QIDMatchReturnsExistingAuthor(t *testing.T) {
	// pseudo-test: this needs a Queries-like interface or test fixture.
	// Use whatever the project's existing test helpers are; if none, set up
	// an in-memory sqlite or testcontainers MySQL.
	t.Skip("requires test infrastructure — see Step 2")
}
```

- [ ] **Step 2: Set up test fixture**

Look at `api_go/tests/` for the existing pattern (e.g. `setup_test.go` or similar). If the project doesn't have a test DB pattern yet, the pragmatic approach is to define a small interface inside `authorResolution.go` that the production code uses, and unit-test the resolution logic with a mock implementation:

```go
// in authorResolution.go
type AuthorResolver interface {
	FindByWikidataID(userID, qid string) (*models.Author, error)
	FindByExactName(userID, name string) ([]models.Author, error)
	Create(userID string, a models.Author) (models.Author, error)
}
```

Then test against a mock that records calls. This decouples the logic from sqlc entirely.

- [ ] **Step 3: Replace the skipped test with the real one**

```go
type fakeResolver struct {
	byQID  map[string]models.Author
	byName map[string][]models.Author
	created []models.Author
}

func (f *fakeResolver) FindByWikidataID(uid, qid string) (*models.Author, error) {
	if a, ok := f.byQID[qid]; ok {
		return &a, nil
	}
	return nil, nil
}
func (f *fakeResolver) FindByExactName(uid, name string) ([]models.Author, error) {
	return f.byName[name], nil
}
func (f *fakeResolver) Create(uid string, a models.Author) (models.Author, error) {
	f.created = append(f.created, a)
	a.ID = "new-" + a.WikidataID
	return a, nil
}

func TestResolveAuthor_QIDMatchReturnsExistingAuthor(t *testing.T) {
	existing := models.Author{ID: "existing-id", Name: "Alfred Reed", WikidataID: "Q371953"}
	r := &fakeResolver{byQID: map[string]models.Author{"Q371953": existing}}

	res, err := ResolveAuthor(r, "user-1", WikidataAuthor{WikidataID: "Q371953", Name: "Alfred Reed"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Status != ResolveStatusMatched {
		t.Errorf("expected matched, got %v", res.Status)
	}
	if res.Author.ID != "existing-id" {
		t.Errorf("expected existing-id, got %s", res.Author.ID)
	}
}
```

- [ ] **Step 4: Run test — expect FAIL**

Run: `cd api_go && go test ./service/ -run TestResolveAuthor -v`
Expected: FAIL "undefined: ResolveAuthor"

- [ ] **Step 5: Implement minimal version**

```go
package service

import (
	"api_go/models"
)

type ResolveStatus int

const (
	ResolveStatusMatched ResolveStatus = iota
	ResolveStatusCreated
	ResolveStatusConflict
)

type ResolveResult struct {
	Status     ResolveStatus
	Author     models.Author
	Candidates []models.Author // populated when Status == Conflict
}

func ResolveAuthor(r AuthorResolver, userID string, w WikidataAuthor) (*ResolveResult, error) {
	if w.WikidataID != "" {
		existing, err := r.FindByWikidataID(userID, w.WikidataID)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return &ResolveResult{Status: ResolveStatusMatched, Author: *existing}, nil
		}
	}
	// next paths in following tasks
	return nil, nil
}
```

- [ ] **Step 6: Run test — expect PASS**

Run: `cd api_go && go test ./service/ -run TestResolveAuthor_QIDMatchReturnsExistingAuthor -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add api_go/service/authorResolution.go api_go/service/authorResolution_test.go
git commit -m "feat(service): author resolution skeleton with QID match path"
```

---

### Task 20: Resolution — same-name conflict path

**Files:**
- Modify: `api_go/service/authorResolution.go`
- Modify: `api_go/service/authorResolution_test.go`

- [ ] **Step 1: Add test**

```go
func TestResolveAuthor_SameNameNoQIDReturnsConflict(t *testing.T) {
	local := models.Author{ID: "local-id", Name: "Johann Strauss", WikidataID: ""}
	r := &fakeResolver{
		byQID:  map[string]models.Author{},
		byName: map[string][]models.Author{"Johann Strauss": {local}},
	}

	res, err := ResolveAuthor(r, "user-1", WikidataAuthor{WikidataID: "Q7349", Name: "Johann Strauss"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Status != ResolveStatusConflict {
		t.Errorf("expected conflict, got %v", res.Status)
	}
	if len(res.Candidates) != 1 || res.Candidates[0].ID != "local-id" {
		t.Errorf("expected 1 candidate local-id, got %+v", res.Candidates)
	}
}
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd api_go && go test ./service/ -run TestResolveAuthor_SameName -v`
Expected: FAIL (returns nil currently).

- [ ] **Step 3: Extend implementation**

In `ResolveAuthor`, after the QID-match block:

```go
	if w.Name != "" {
		matches, err := r.FindByExactName(userID, w.Name)
		if err != nil {
			return nil, err
		}
		conflicts := make([]models.Author, 0, len(matches))
		for _, m := range matches {
			if m.WikidataID == "" {
				conflicts = append(conflicts, m)
			}
		}
		if len(conflicts) > 0 {
			return &ResolveResult{Status: ResolveStatusConflict, Candidates: conflicts}, nil
		}
	}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `cd api_go && go test ./service/ -run TestResolveAuthor -v`
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api_go/service/authorResolution.go api_go/service/authorResolution_test.go
git commit -m "feat(service): conflict detection for same-name authors without QID"
```

---

### Task 21: Resolution — fresh-create path

**Files:**
- Modify: `api_go/service/authorResolution.go`
- Modify: `api_go/service/authorResolution_test.go`

- [ ] **Step 1: Add test**

```go
func TestResolveAuthor_NewQIDNoNameMatchCreates(t *testing.T) {
	r := &fakeResolver{}
	bd := int16(1770)
	dd := int16(1827)
	res, err := ResolveAuthor(r, "user-1", WikidataAuthor{
		WikidataID: "Q255",
		Name:       "Ludwig van Beethoven",
		BirthYear:  &bd,
		DeathYear:  &dd,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Status != ResolveStatusCreated {
		t.Errorf("expected created, got %v", res.Status)
	}
	if res.Author.Name != "Ludwig van Beethoven" {
		t.Errorf("expected Beethoven, got %s", res.Author.Name)
	}
	if res.Author.WikidataID != "Q255" {
		t.Errorf("expected Q255, got %s", res.Author.WikidataID)
	}
	if len(r.created) != 1 {
		t.Errorf("expected 1 create, got %d", len(r.created))
	}
}
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd api_go && go test ./service/ -run TestResolveAuthor_NewQID -v`
Expected: FAIL.

- [ ] **Step 3: Extend implementation**

At the end of `ResolveAuthor`, before the trailing `return nil, nil`:

```go
	newAuthor := models.Author{
		Name:       w.Name,
		WikidataID: w.WikidataID,
		BirthYear:  w.BirthYear,
		DeathYear:  w.DeathYear,
	}
	created, err := r.Create(userID, newAuthor)
	if err != nil {
		return nil, err
	}
	return &ResolveResult{Status: ResolveStatusCreated, Author: created}, nil
```

(Remove the dangling `return nil, nil`.)

- [ ] **Step 4: Run all resolution tests — expect PASS**

Run: `cd api_go && go test ./service/ -run TestResolveAuthor -v`
Expected: 3 tests PASS.

- [ ] **Step 5: Implement the production `AuthorResolver` adapter**

Add to the same file:

```go
type sqlcAuthorResolver struct {
	svc    *AuthorService
	create func(userID string, a models.Author) (models.Author, error)
}

func NewSqlcAuthorResolver(svc *AuthorService) AuthorResolver {
	return &sqlcAuthorResolver{svc: svc}
}

func (s *sqlcAuthorResolver) FindByWikidataID(userID, qid string) (*models.Author, error) {
	row, err := s.svc.Queries.FindAuthorByUserAndWikidataId(s.svc.Ctx, db.FindAuthorByUserAndWikidataIdParams{
		UserIDFk:   db.NewSQLNullString(userID),
		WikidataID: db.NewSQLNullString(qid),
	})
	if err != nil {
		// sql.ErrNoRows → not a real error
		return nil, nil
	}
	a := mappers.ConvertAuthorFromEntity(row)
	return &a, nil
}

func (s *sqlcAuthorResolver) FindByExactName(userID, name string) ([]models.Author, error) {
	rows, err := s.svc.Queries.FindAuthorsByUserAndExactName(s.svc.Ctx, db.FindAuthorsByUserAndExactNameParams{
		UserIDFk: db.NewSQLNullString(userID),
		Name:     db.NewSQLNullString(name),
	})
	if err != nil {
		return nil, err
	}
	out := make([]models.Author, 0, len(rows))
	for _, r := range rows {
		out = append(out, mappers.ConvertAuthorFromEntity(r))
	}
	return out, nil
}

func (s *sqlcAuthorResolver) Create(userID string, a models.Author) (models.Author, error) {
	return s.svc.CreateAuthor(dto.AuthorCreateDto{
		Name:             a.Name,
		ExtraInformation: a.ExtraInformation,
		WikidataID:       a.WikidataID,
		BirthYear:        a.BirthYear,
		DeathYear:        a.DeathYear,
	}, userID)
}
```

Required imports: `api_go/db`, `api_go/mappers`, `api_go/controllers/dto`. Also: don't import `"errors"` unless you need it; the sql.ErrNoRows path is already handled by returning `(nil, nil)` on any error from FindByWikidataID — refine later if you want to surface real DB errors separately.

- [ ] **Step 6: Build**

Run: `cd api_go && go build ./...`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add api_go/service/authorResolution.go api_go/service/authorResolution_test.go
git commit -m "feat(service): author resolution create path and sqlc adapter"
```

---

## Phase 6: Autocomplete and From-Wikidata Endpoints

### Task 22: `GET /api/v1/autocomplete/works`

**Files:**
- Create: `api_go/controllers/autocomplete.go`

- [ ] **Step 1: Create autocomplete DTOs**

Create `api_go/controllers/dto/AutocompleteDto.go`:

```go
package dto

type AutocompleteAuthor struct {
	ID          string `json:"id,omitempty"`
	WikidataID  string `json:"wikidataId,omitempty"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	BirthYear   *int16 `json:"birthYear,omitempty"`
	DeathYear   *int16 `json:"deathYear,omitempty"`
}

type AutocompleteWork struct {
	ID              string              `json:"id,omitempty"`
	WikidataID      string              `json:"wikidataId,omitempty"`
	Name            string              `json:"name"`
	Description     string              `json:"description,omitempty"`
	CompositionYear *int16              `json:"compositionYear,omitempty"`
	Genre           string              `json:"genre,omitempty"`
	Composer        *AutocompleteAuthor `json:"composer,omitempty"`
	Arranger        *AutocompleteAuthor `json:"arranger,omitempty"`
}

type AutocompleteWorksResponse struct {
	Local    []AutocompleteWork `json:"local"`
	External []AutocompleteWork `json:"external"`
}

type AutocompleteAuthorsResponse struct {
	Local    []AutocompleteAuthor `json:"local"`
	External []AutocompleteAuthor `json:"external"`
}
```

- [ ] **Step 2: Implement the works endpoint**

```go
package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/service"
	"sync"

	"github.com/gofiber/fiber/v3"
)

// GetWorksAutocomplete godoc
// @Summary  Autocomplete suggestions for works (local + Wikidata)
// @Tags     autocomplete
// @Produce  json
// @Param    q  query  string  true  "Search term (min 2 chars)"
// @Success  200  {object}  dto.AutocompleteWorksResponse
// @Router   /v1/autocomplete/works [get]
func GetWorksAutocomplete(c fiber.Ctx) error {
	q := c.Query("q")
	if len(q) < 2 {
		return c.JSON(dto.AutocompleteWorksResponse{Local: []dto.AutocompleteWork{}, External: []dto.AutocompleteWork{}})
	}
	userId := GetLocal[string](c, constants.UserId)
	noteService := GetLocal[service.NoteService](c, constants.NoteService)
	wd := GetLocal[*service.WikidataService](c, constants.WikidataService)

	var (
		local    []dto.AutocompleteWork
		external []dto.AutocompleteWork
		wg       sync.WaitGroup
	)

	wg.Add(2)
	go func() {
		defer wg.Done()
		local = noteService.AutocompleteLocalWorks(userId, q)
	}()
	go func() {
		defer wg.Done()
		results, err := wd.SearchWorks(q)
		if err != nil {
			external = []dto.AutocompleteWork{}
			return
		}
		external = make([]dto.AutocompleteWork, 0, len(results))
		for _, r := range results {
			w := dto.AutocompleteWork{
				WikidataID:      r.WikidataID,
				Name:            r.Name,
				Description:     r.Description,
				CompositionYear: r.Year,
				Genre:           r.Genre,
			}
			if r.Composer != nil {
				w.Composer = &dto.AutocompleteAuthor{
					WikidataID: r.Composer.WikidataID,
					Name:       r.Composer.Name,
				}
			}
			external = append(external, w)
		}
	}()
	wg.Wait()

	return c.JSON(dto.AutocompleteWorksResponse{Local: local, External: external})
}
```

- [ ] **Step 3: Implement `NoteService.AutocompleteLocalWorks`**

Add to `noteService.go`:

```go
func (n *NoteService) AutocompleteLocalWorks(userId, q string) []dto.AutocompleteWork {
	rows, err := n.Queries.FindElementsByUserAndNameLike(context.Background(), db.FindElementsByUserAndNameLikeParams{
		UserIDFk: db.NewSQLNullString(userId),
		CONCAT:   q,
	})
	if err != nil {
		return []dto.AutocompleteWork{}
	}
	out := make([]dto.AutocompleteWork, 0, len(rows))
	for _, r := range rows {
		out = append(out, dto.AutocompleteWork{
			ID:         r.ID,
			Name:       r.Name.String,
			WikidataID: r.WikidataID.String,
			Genre:      r.Genre.String,
		})
	}
	return out
}
```

(Composer/Arranger fields can be filled in if we want — but Phase 6 keeps it minimal; user can already see name + identify duplicate.)

- [ ] **Step 4: Register route**

In `setupRouter.go`, add inside the `profile.Route("v1/autocomplete", ...)` block (create if doesn't exist):

```go
profile.Route("v1/autocomplete", func(r fiber.Router) {
	r.Get("/works", controllers.GetWorksAutocomplete)
})
```

- [ ] **Step 5: Build**

Run: `cd api_go && go build ./...`
Expected: clean.

- [ ] **Step 6: Smoke test**

Start the API. Curl: `curl 'http://localhost:8080/api/v1/autocomplete/works?q=Armenian'`
Expected: JSON with `local` array (probably empty) and `external` containing at least one work.

- [ ] **Step 7: Commit**

```bash
git add api_go/controllers/autocomplete.go api_go/controllers/dto/AutocompleteDto.go api_go/service/noteService.go api_go/routers/setupRouter.go
git commit -m "feat(api): GET /v1/autocomplete/works endpoint"
```

---

### Task 23: `GET /api/v1/autocomplete/authors`

**Files:**
- Modify: `api_go/controllers/autocomplete.go`
- Modify: `api_go/service/authorService.go`
- Modify: `api_go/routers/setupRouter.go`

- [ ] **Step 1: Add `AutocompleteLocalAuthors` to AuthorService**

```go
func (a *AuthorService) AutocompleteLocalAuthors(userId, q string) []dto.AutocompleteAuthor {
	rows, err := a.Queries.FindAuthorsByUserAndNameLike(a.Ctx, db.FindAuthorsByUserAndNameLikeParams{
		UserIDFk: db.NewSQLNullString(userId),
		CONCAT:   q,
	})
	if err != nil {
		return []dto.AutocompleteAuthor{}
	}
	out := make([]dto.AutocompleteAuthor, 0, len(rows))
	for _, r := range rows {
		ac := dto.AutocompleteAuthor{
			ID:         r.ID,
			Name:       r.Name.String,
			WikidataID: r.WikidataID.String,
		}
		if r.BirthYear.Valid {
			v := r.BirthYear.Int16
			ac.BirthYear = &v
		}
		if r.DeathYear.Valid {
			v := r.DeathYear.Int16
			ac.DeathYear = &v
		}
		out = append(out, ac)
	}
	return out
}
```

- [ ] **Step 2: Add controller function**

```go
// GetAuthorsAutocomplete godoc
// @Summary  Autocomplete suggestions for authors (local + Wikidata)
// @Tags     autocomplete
// @Produce  json
// @Param    q  query  string  true  "Search term (min 2 chars)"
// @Success  200  {object}  dto.AutocompleteAuthorsResponse
// @Router   /v1/autocomplete/authors [get]
func GetAuthorsAutocomplete(c fiber.Ctx) error {
	q := c.Query("q")
	if len(q) < 2 {
		return c.JSON(dto.AutocompleteAuthorsResponse{Local: []dto.AutocompleteAuthor{}, External: []dto.AutocompleteAuthor{}})
	}
	userId := GetLocal[string](c, constants.UserId)
	authorService := GetLocal[service.AuthorService](c, constants.AuthorService)
	wd := GetLocal[*service.WikidataService](c, constants.WikidataService)

	var (
		local    []dto.AutocompleteAuthor
		external []dto.AutocompleteAuthor
		wg       sync.WaitGroup
	)
	wg.Add(2)
	go func() {
		defer wg.Done()
		local = authorService.AutocompleteLocalAuthors(userId, q)
	}()
	go func() {
		defer wg.Done()
		results, err := wd.SearchAuthors(q)
		if err != nil {
			external = []dto.AutocompleteAuthor{}
			return
		}
		external = make([]dto.AutocompleteAuthor, 0, len(results))
		for _, r := range results {
			external = append(external, dto.AutocompleteAuthor{
				WikidataID:  r.WikidataID,
				Name:        r.Name,
				Description: r.Description,
				BirthYear:   r.BirthYear,
				DeathYear:   r.DeathYear,
			})
		}
	}()
	wg.Wait()

	return c.JSON(dto.AutocompleteAuthorsResponse{Local: local, External: external})
}
```

- [ ] **Step 3: Register route**

Add inside the autocomplete route block in `setupRouter.go`:

```go
r.Get("/authors", controllers.GetAuthorsAutocomplete)
```

- [ ] **Step 4: Build + smoke**

Run: `cd api_go && go build ./...`
Then `curl 'http://localhost:8080/api/v1/autocomplete/authors?q=Reed'`
Expected: external array contains Alfred Reed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(api): GET /v1/autocomplete/authors endpoint"
```

---

### Task 24: `POST /api/v1/works/from-wikidata` — happy path

**Files:**
- Create: `api_go/controllers/worksFromWikidata.go`
- Create: `api_go/controllers/dto/WorkFromWikidataDto.go`
- Modify: `api_go/routers/setupRouter.go`

- [ ] **Step 1: Create DTOs**

```go
package dto

type WorkFromWikidataRequest struct {
	WikidataID      string `json:"wikidataId" validate:"required"`
	ParentID        string `json:"parentId" validate:"required"`
	ForceNewAuthor  bool   `json:"forceNewAuthor"`
}

type WorkFromWikidataConflictResponse struct {
	Incoming   AutocompleteAuthor   `json:"incoming"`
	Candidates []AutocompleteAuthor `json:"candidates"`
}
```

- [ ] **Step 2: Controller**

```go
package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/service"

	"github.com/gofiber/fiber/v3"
)

// PostWorkFromWikidata godoc
// @Summary  Create a note (work) from a Wikidata entry
// @Tags     elements
// @Accept   json
// @Produce  json
// @Param    body  body  dto.WorkFromWikidataRequest  true  "Wikidata source + parent folder"
// @Success  200   {object}  dto.Note
// @Failure  409   {object}  dto.WorkFromWikidataConflictResponse
// @Router   /v1/works/from-wikidata [post]
func PostWorkFromWikidata(c fiber.Ctx) error {
	var req dto.WorkFromWikidataRequest
	if err := c.Bind().Body(&req); err != nil {
		return err
	}
	userId := GetLocal[string](c, constants.UserId)
	wd := GetLocal[*service.WikidataService](c, constants.WikidataService)
	authorService := GetLocal[service.AuthorService](c, constants.AuthorService)
	noteService := GetLocal[service.NoteService](c, constants.NoteService)

	work, err := wd.GetWorkDetail(req.WikidataID)
	if err != nil {
		return c.Status(502).JSON(fiber.Map{"error": "wikidata lookup failed: " + err.Error()})
	}

	var composer *models.Author
	if work.Composer != nil {
		resolver := service.NewSqlcAuthorResolver(&authorService)
		res, err := service.ResolveAuthor(resolver, userId, *work.Composer)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		if res.Status == service.ResolveStatusConflict && !req.ForceNewAuthor {
			return c.Status(409).JSON(dto.WorkFromWikidataConflictResponse{
				Incoming: dto.AutocompleteAuthor{
					WikidataID:  work.Composer.WikidataID,
					Name:        work.Composer.Name,
					Description: work.Composer.Description,
					BirthYear:   work.Composer.BirthYear,
					DeathYear:   work.Composer.DeathYear,
				},
				Candidates: candidatesToDTO(res.Candidates),
			})
		}
		if res.Status == service.ResolveStatusConflict && req.ForceNewAuthor {
			created, err := authorService.CreateAuthor(dto.AuthorCreateDto{
				Name:       work.Composer.Name,
				WikidataID: work.Composer.WikidataID,
				BirthYear:  work.Composer.BirthYear,
				DeathYear:  work.Composer.DeathYear,
			}, userId)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": err.Error()})
			}
			composer = &created
		} else {
			composer = &res.Author
		}
	}

	note, err := noteService.CreateNoteFromWikidata(userId, req.ParentID, *work, composer)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(mappers.ConvertNoteDtoFromModel(note))
}

func candidatesToDTO(cs []models.Author) []dto.AutocompleteAuthor {
	out := make([]dto.AutocompleteAuthor, 0, len(cs))
	for _, c := range cs {
		out = append(out, dto.AutocompleteAuthor{
			ID:         c.ID,
			Name:       c.Name,
			WikidataID: c.WikidataID,
			BirthYear:  c.BirthYear,
			DeathYear:  c.DeathYear,
		})
	}
	return out
}
```

- [ ] **Step 3: Implement `NoteService.CreateNoteFromWikidata`**

```go
func (n *NoteService) CreateNoteFromWikidata(userId, parentId string, work service.WikidataWork, composer *models.Author) (models.Note, error) {
	noteId, _ := uuid.NewRandom()
	var composerIdFk sql.NullString
	if composer != nil {
		composerIdFk = db.NewSQLNullString(composer.ID)
	}
	var compYear sql.NullInt16
	if work.Year != nil {
		compYear = sql.NullInt16{Int16: *work.Year, Valid: true}
	}
	_, err := n.Queries.CreateNoteWithWikidata(context.Background(), db.CreateNoteWithWikidataParams{
		ID:              noteId.String(),
		Description:     db.NewSQLNullString(work.Description),
		Name:            db.NewSQLNullString(work.Name),
		NumberOfPages:   sql.NullInt32{},
		UserIDFk:        db.NewSQLNullString(userId),
		Parent:          db.NewSQLNullString(parentId),
		ComposerIDFk:    composerIdFk,
		ArrangerIDFk:    sql.NullString{},
		WikidataID:      db.NewSQLNullString(work.WikidataID),
		CompositionYear: compYear,
		Genre:           db.NewSQLNullString(work.Genre),
	})
	if err != nil {
		return models.Note{}, err
	}
	return n.LoadNoteById(noteId.String(), userId)
}
```

(`LoadNoteById` exists or needs adding — check `noteService.go` for a similar function and reuse.)

- [ ] **Step 4: Register route**

In `setupRouter.go`:

```go
profile.Route("v1/works", func(r fiber.Router) {
	r.Post("/from-wikidata", controllers.PostWorkFromWikidata)
})
```

- [ ] **Step 5: Build**

Run: `cd api_go && go build ./...`
Expected: clean. If the controller import `api_go/models` is missing, add it.

- [ ] **Step 6: Smoke test happy path**

```bash
curl -X POST http://localhost:8080/api/v1/works/from-wikidata \
  -H 'Content-Type: application/json' \
  -d '{"wikidataId":"Q4791234","parentId":"<an existing folder id>"}'
```

Expected: 200 with a Note JSON including composer.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(api): POST /v1/works/from-wikidata with author conflict handling"
```

---

### Task 25: Test the conflict path end-to-end

**Files:**
- Modify: `api_go/service/authorResolution_test.go` (or create an integration test file)

- [ ] **Step 1: Add an integration-style test that exercises ResolveAuthor through a mock that returns the conflict-name case**

```go
func TestResolveAuthor_ForceNewBypassesConflict(t *testing.T) {
	// not a test of an existing function — documents that conflict is purely
	// observational and the controller layer decides to retry with force.
	// Real test of force happens at HTTP layer (manual or e2e).
	t.Skip("force-new-author is a controller-level concern; see manual verification in Phase 8")
}
```

This is intentionally a skipped placeholder so the conflict semantic is documented. The real verification happens manually in Phase 8.

- [ ] **Step 2: Commit**

```bash
git add api_go/service/authorResolution_test.go
git commit -m "test: placeholder doc for force-new-author conflict bypass"
```

---

### Task 26: Frontend stop here for Phase 6 — backend checkpoint

- [ ] **Step 1: Manual sanity check of all three endpoints**

Run dev API. Three curls:

```bash
curl 'http://localhost:8080/api/v1/autocomplete/works?q=Armenian'
curl 'http://localhost:8080/api/v1/autocomplete/authors?q=Reed'
curl -X POST http://localhost:8080/api/v1/works/from-wikidata -H 'Content-Type: application/json' -d '{"wikidataId":"Q4791234","parentId":"<folder>"}'
```

Each should respond sanely. If the third returns 409, follow up with `forceNewAuthor:true`.

- [ ] **Step 2: All Go tests green**

Run: `cd api_go && go test ./...`
Expected: PASS.

- [ ] **Step 3: Commit any accumulated cleanup**

```bash
git status
git add -A
git commit -m "chore: backend phase 6 checkpoint" --allow-empty
```

**Checkpoint:** Backend is feature-complete. Frontend integration in Phase 7.

---

### Task 27: Pause point — review before frontend

- [ ] **Step 1: Read through the changed files**

Use `git diff master --stat` and skim the spec sections to confirm coverage:

- Schema changes ✓ (Task 1)
- Composer/Arranger split throughout ✓ (Tasks 4-12)
- Wikidata client with three lookups ✓ (Tasks 14-17)
- Author resolution with three paths ✓ (Tasks 19-21)
- Three new endpoints ✓ (Tasks 22-24)

If anything is missing, add a follow-up task here before proceeding to Phase 7.

---

## Phase 7: Frontend

### Task 28: TypeScript types for the new endpoints

**Files:**
- Create: `ui/src/models/Autocomplete.ts`

- [ ] **Step 1: Define types matching the Go DTOs**

```typescript
export interface AutocompleteAuthor {
  id?: string;
  wikidataId?: string;
  name: string;
  description?: string;
  birthYear?: number;
  deathYear?: number;
}

export interface AutocompleteWork {
  id?: string;
  wikidataId?: string;
  name: string;
  description?: string;
  compositionYear?: number;
  genre?: string;
  composer?: AutocompleteAuthor;
  arranger?: AutocompleteAuthor;
}

export interface AutocompleteWorksResponse {
  local: AutocompleteWork[];
  external: AutocompleteWork[];
}

export interface AutocompleteAuthorsResponse {
  local: AutocompleteAuthor[];
  external: AutocompleteAuthor[];
}

export interface WorkFromWikidataRequest {
  wikidataId: string;
  parentId: string;
  forceNewAuthor?: boolean;
}

export interface WorkFromWikidataConflict {
  incoming: AutocompleteAuthor;
  candidates: AutocompleteAuthor[];
}
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/models/Autocomplete.ts
git commit -m "feat(ui): types for autocomplete endpoints"
```

---

### Task 29: API client functions

**Files:**
- Modify: `ui/src/api/` (find the existing api client file pattern; if it doesn't exist, create `ui/src/api/autocomplete.ts`)

- [ ] **Step 1: Read existing API client style**

Use Glob `ui/src/api/**` and read one existing function to match style (fetch vs. axios, auth header handling, base URL constant).

- [ ] **Step 2: Add three functions**

```typescript
import { AutocompleteAuthorsResponse, AutocompleteWorksResponse, WorkFromWikidataRequest, WorkFromWikidataConflict } from "../models/Autocomplete";
import { Note } from "../models/Note";  // adjust path

export async function fetchWorksAutocomplete(q: string): Promise<AutocompleteWorksResponse> {
  const resp = await fetch(`/api/v1/autocomplete/works?q=${encodeURIComponent(q)}`, {
    headers: getAuthHeaders(),
  });
  if (!resp.ok) throw new Error(`autocomplete works: ${resp.status}`);
  return resp.json();
}

export async function fetchAuthorsAutocomplete(q: string): Promise<AutocompleteAuthorsResponse> {
  const resp = await fetch(`/api/v1/autocomplete/authors?q=${encodeURIComponent(q)}`, {
    headers: getAuthHeaders(),
  });
  if (!resp.ok) throw new Error(`autocomplete authors: ${resp.status}`);
  return resp.json();
}

export async function createWorkFromWikidata(req: WorkFromWikidataRequest): Promise<Note | { conflict: WorkFromWikidataConflict }> {
  const resp = await fetch(`/api/v1/works/from-wikidata`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (resp.status === 409) {
    const conflict = await resp.json() as WorkFromWikidataConflict;
    return { conflict };
  }
  if (!resp.ok) throw new Error(`from-wikidata: ${resp.status}`);
  return resp.json();
}
```

Adjust `getAuthHeaders` to whatever the project uses (e.g. Keycloak token from a hook or context).

- [ ] **Step 3: Commit**

```bash
git add ui/src/api/autocomplete.ts
git commit -m "feat(ui): API client for autocomplete endpoints"
```

---

### Task 30: Debounced autocomplete hook

**Files:**
- Create: `ui/src/hooks/useDebouncedAutocomplete.ts`

- [ ] **Step 1: Implement the hook**

```typescript
import { useEffect, useRef, useState } from "react";

export function useDebouncedAutocomplete<T>(
  query: string,
  fetcher: (q: string) => Promise<T>,
  delayMs = 300,
  minLen = 2,
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (query.length < minLen) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    timerRef.current = setTimeout(() => {
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);
      fetcher(query)
        .then(r => {
          if (!ac.signal.aborted) setData(r);
        })
        .catch(e => {
          if (!ac.signal.aborted) setError(e);
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false);
        });
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, delayMs, minLen, fetcher]);

  return { data, loading, error };
}
```

NOTE: The fetcher functions in Task 29 don't yet accept an AbortSignal — adding one is a clean extension, but for the first version it's fine to let the in-flight request resolve and just drop the result via the aborted flag. If the hook usage shows latency issues later, thread the signal into the fetcher.

- [ ] **Step 2: Commit**

```bash
git add ui/src/hooks/useDebouncedAutocomplete.ts
git commit -m "feat(ui): useDebouncedAutocomplete hook"
```

---

### Task 31: WorkAutocompleteInput component

**Files:**
- Create: `ui/src/components/searchBars/WorkAutocompleteInput.tsx`

- [ ] **Step 1: Implement**

```tsx
import React, { useState } from "react";
import { useDebouncedAutocomplete } from "../../hooks/useDebouncedAutocomplete";
import { fetchWorksAutocomplete } from "../../api/autocomplete";
import { AutocompleteWork } from "../../models/Autocomplete";

interface Props {
  onPickLocal: (w: AutocompleteWork) => void;
  onPickExternal: (w: AutocompleteWork) => void;
  placeholder?: string;
}

export function WorkAutocompleteInput({ onPickLocal, onPickExternal, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data, loading } = useDebouncedAutocomplete(query, fetchWorksAutocomplete);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder ?? "Titel suchen…"}
        className="w-full px-3 py-2 border rounded"
      />
      {open && (data || loading) && (
        <div className="absolute z-10 w-full bg-white border rounded shadow mt-1 max-h-80 overflow-auto">
          {loading && <div className="px-3 py-2 text-gray-500">Suche…</div>}
          {data && data.local.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs uppercase text-gray-500 bg-gray-50">Aus meiner Sammlung</div>
              {data.local.map(w => (
                <button
                  key={w.id}
                  type="button"
                  className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                  onMouseDown={() => { onPickLocal(w); setOpen(false); }}
                >
                  {w.name}
                </button>
              ))}
            </>
          )}
          {data && data.external.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs uppercase text-gray-500 bg-gray-50">Aus Wikidata</div>
              {data.external.map(w => (
                <button
                  key={w.wikidataId}
                  type="button"
                  className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                  onMouseDown={() => { onPickExternal(w); setOpen(false); }}
                >
                  <div className="font-medium">{w.name}</div>
                  <div className="text-xs text-gray-600">
                    {w.description}
                    {w.composer && <> · {w.composer.name}</>}
                    {w.compositionYear && <> · {w.compositionYear}</>}
                  </div>
                </button>
              ))}
            </>
          )}
          {data && data.local.length === 0 && data.external.length === 0 && !loading && (
            <div className="px-3 py-2 text-gray-500">Keine Treffer</div>
          )}
        </div>
      )}
    </div>
  );
}
```

(Adapt the className strings to your CSS framework — tailwind is assumed but the project may use something else.)

- [ ] **Step 2: Commit**

```bash
git add ui/src/components/searchBars/WorkAutocompleteInput.tsx
git commit -m "feat(ui): WorkAutocompleteInput component with local + external sections"
```

---

### Task 32: Wire into the Create Note dialog

**Files:**
- Modify: `ui/src/components/CreateFolderOrNote.tsx` (or whichever component is the active create-note form — confirm via Grep)

- [ ] **Step 1: Identify the active form**

Use Grep: pattern `Titel` or `noteName` in `ui/src/components/` to find the Create Note form.

- [ ] **Step 2: Replace the title <input> with WorkAutocompleteInput**

When user picks external:

```tsx
onPickExternal={async w => {
  const result = await createWorkFromWikidata({
    wikidataId: w.wikidataId!,
    parentId: currentFolderId,
  });
  if ("conflict" in result) {
    setConflict(result.conflict);
  } else {
    onNoteCreated(result);
    closeDialog();
  }
}}
```

When user picks local:

```tsx
onPickLocal={w => {
  // Just fill the title field with the existing name — let user confirm "already exists?"
  setName(w.name);
  setExistingMatchId(w.id);
}}
```

- [ ] **Step 3: Smoke test in browser**

Start the dev server + API. Type "Armenian" — the dropdown shows external. Click the external entry → if no conflict, a new note is created with composer set.

- [ ] **Step 4: Commit**

```bash
git add ui/src/components/CreateFolderOrNote.tsx
git commit -m "feat(ui): wire WorkAutocompleteInput into create note dialog"
```

---

### Task 33: Author conflict dialog

**Files:**
- Create: `ui/src/components/AuthorConflictDialog.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from "react";
import { WorkFromWikidataConflict, AutocompleteAuthor } from "../models/Autocomplete";

interface Props {
  conflict: WorkFromWikidataConflict;
  onLinkExisting: (candidate: AutocompleteAuthor) => void;
  onCreateNew: () => void;
  onCancel: () => void;
}

export function AuthorConflictDialog({ conflict, onLinkExisting, onCreateNew, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 max-w-lg w-full">
        <h3 className="text-lg font-semibold mb-2">Autor bereits vorhanden?</h3>
        <p className="mb-3">
          Du hast bereits einen Autor namens <strong>{conflict.candidates[0].name}</strong>.
          Ist das derselbe wie <strong>{conflict.incoming.name}</strong>
          {conflict.incoming.description && <> ({conflict.incoming.description})</>}?
        </p>
        <div className="space-y-2 mb-4">
          {conflict.candidates.map(c => (
            <button
              key={c.id}
              className="block w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
              onClick={() => onLinkExisting(c)}
            >
              <strong>Mit „{c.name}" verknüpfen</strong>
              {c.birthYear && <span className="ml-2 text-gray-600">({c.birthYear}–{c.deathYear ?? ""})</span>}
            </button>
          ))}
          <button
            className="block w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
            onClick={onCreateNew}
          >
            <strong>Als neuen Autor anlegen</strong>
            <div className="text-xs text-gray-600">Beide Autoren bleiben getrennt</div>
          </button>
        </div>
        <div className="flex justify-end">
          <button className="px-4 py-2 text-gray-600" onClick={onCancel}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into the create dialog from Task 32**

In `CreateFolderOrNote.tsx` (or wherever you store the `conflict` state):

```tsx
{conflict && (
  <AuthorConflictDialog
    conflict={conflict}
    onLinkExisting={async (candidate) => {
      // PATCH the local author with the incoming QID
      await patchAuthor(candidate.id!, { wikidataId: conflict.incoming.wikidataId });
      // retry the work creation — author is now QID-matched
      const result = await createWorkFromWikidata({
        wikidataId: pendingWikidataId!,
        parentId: currentFolderId,
      });
      if (!("conflict" in result)) {
        onNoteCreated(result);
        setConflict(null);
        closeDialog();
      }
    }}
    onCreateNew={async () => {
      const result = await createWorkFromWikidata({
        wikidataId: pendingWikidataId!,
        parentId: currentFolderId,
        forceNewAuthor: true,
      });
      if (!("conflict" in result)) {
        onNoteCreated(result);
        setConflict(null);
        closeDialog();
      }
    }}
    onCancel={() => setConflict(null)}
  />
)}
```

`patchAuthor` already exists in the API client — verify by Grep, otherwise add it following the existing PATCH /authors/:id pattern.

- [ ] **Step 3: Commit**

```bash
git add ui/src/components/AuthorConflictDialog.tsx ui/src/components/CreateFolderOrNote.tsx
git commit -m "feat(ui): author conflict dialog with link/new-author/cancel"
```

---

### Task 34: Wikidata badge on list items

**Files:**
- Modify: `ui/src/pages/FolderView.tsx` (or wherever notes are rendered in a list)

- [ ] **Step 1: Add a small icon next to notes with a non-empty wikidataId**

```tsx
{note.wikidataId && (
  <span title="Aus Wikidata angereichert" className="ml-2 inline-block w-4 h-4">
    {/* swap for the project's icon system (Lucide etc.) */}
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-600"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor">W</text></svg>
  </span>
)}
```

Apply the same conditional in the Author list (`AuthorView.tsx`) using `author.wikidataId`.

- [ ] **Step 2: Type-check + smoke**

Run: `cd ui && npm run typecheck`
Visit a folder with a Wikidata-enriched note: the icon appears.

- [ ] **Step 3: Commit**

```bash
git add ui/src/pages/FolderView.tsx ui/src/pages/AuthorView.tsx
git commit -m "feat(ui): wikidata badge on enriched notes and authors"
```

---

## Phase 8: Manual Verification

### Task 35: End-to-end manual run

- [ ] **Step 1: Test "Armenian Dances" (classical concert band, well-represented)**

In the UI: New note → type "Armenian" → external suggests "Armenian Dances" with composer Alfred Reed → pick it → expect a note created with name + composer + year + description filled. No conflict.

- [ ] **Step 2: Test "Dancing Queen" (Pop, composer/performer ambiguity)**

New note → type "Dancing Queen" → external suggests at least one entry → pick → expect composer = Andersson or Ulvaeus (whoever P86 yielded first). Verify the note is created. The "ABBA as author" workaround is documented in the spec — user can manually set arranger if needed.

- [ ] **Step 3: Test conflict path**

Manually create an author "Alfred Reed" via the existing UI flow (no Wikidata). Then redo Step 1 with a different work by Reed (e.g. "El Camino Real" Q5347006) → expect 409 conflict dialog → click "Verknüpfen" → expect the local author is updated with QID, and the note is created using that author.

- [ ] **Step 4: Test "Abba Gold" blasmusik (negative case)**

Type "Abba Gold" → external probably empty or unrelated → user falls back to manual entry. Verify that manually entering a new arranger ("Robert Sebregts") and a name without QID works as before. Then on the next search for "Sebregts" → local autocomplete finds him. Expected: graceful degradation, no errors.

- [ ] **Step 5: Test Wikidata downtime (resilience)**

Block outbound traffic to `query.wikidata.org` (firewall, or temporarily mis-configure the endpoint URL). Verify the autocomplete still returns local results without errors, just an empty `external` array.

- [ ] **Step 6: Document any issues found**

Open issues for any bugs. If everything passes, write a brief summary in the PR description.

- [ ] **Step 7: Final commit (if any small fixes)**

```bash
git add -A
git commit -m "fix: small adjustments from manual verification"
```

---

## Done

- Schema split with composer/arranger ✓
- Wikidata-enriched autocomplete on works and authors ✓
- QID-based author dedup with conflict UI ✓
- Graceful degradation when Wikidata is unavailable ✓
- Visual badge for enriched entries ✓

Open follow-ups (deferred from spec):
- Wikidata response caching
- Bulk re-enrichment of existing notes
- Better Blasmusik coverage (publisher catalogs)
- M:N authors per work
