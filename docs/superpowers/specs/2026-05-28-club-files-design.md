# Feature B — Club File Uploads (Dateien) Design

Date: 2026-05-28
Status: Approved (design), pending spec review

## Purpose

Let club members upload, list, download, and delete shared files within a club
("Dateien" section). Files are stored as binary blobs in MySQL — consistent with how
note PDFs are stored today (decision: DB blobs).

## Scope (YAGNI)

In scope: flat list of files per club; upload (multipart), list (metadata only),
download (streamed), delete; size cap; permission gating on `dateien` section-write.

Out of scope: folders/categories, versioning, previews/thumbnails, S3/object storage,
file sharing outside the club. The blob storage decision means we cap file size to keep
the DB sane.

## Data Model

New Goose migration `data/sql/migrations/0000021_club_files.sql` (A uses 0000020,
C uses 0000022):

```sql
-- +goose Up
CREATE TABLE club_file (
    id                 VARCHAR(36)  NOT NULL,
    club_id            VARCHAR(255) NOT NULL,
    name               VARCHAR(500) NOT NULL,
    mime_type          VARCHAR(255) NOT NULL,
    size_bytes         BIGINT       NOT NULL,
    content            LONGBLOB     NOT NULL,
    uploaded_by_user_id VARCHAR(255) NOT NULL,
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY club_file_club_idx (club_id, created_at),
    CONSTRAINT club_file_fk_club FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE CASCADE,
    CONSTRAINT club_file_fk_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES user (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;

-- +goose Down
DROP TABLE club_file;
```

sqlc queries (`query.sql`): `CreateClubFile`, `GetClubFileContent` (id+content+mime+name),
`ListClubFilesForClub` (metadata only — **never select `content` in the list query**),
`DeleteClubFile`. Uploader display name joined from `user`.

Note: `LONGBLOB` + a separate metadata-only list query is essential — listing must not
pull file bytes. MySQL `max_allowed_packet` and the app body limit must accommodate the
size cap (see below).

## API Contract

Handlers in new `controllers/clubFiles.go`, service `service/clubFileService.go`,
queries `db/club_file_queries.go`. Routes under `v1/clubs` group.

Size cap: **25 MB** per file. Enforced in the handler (reject larger with 413) and the
Fiber `BodyLimit` config must be >= 25 MB for these routes (verify current global limit
in `setupRouter.go`; raise if needed, scoped as narrowly as possible).

DTO `dto.ClubFileDto` (metadata only):
```
id           string
clubId       string
name         string
mimeType     string
sizeBytes    int64
uploadedById string
uploadedBy   string   // display name
createdAt    string   // RFC3339
```

| Method | Path | Handler | Auth/gate | Returns |
|---|---|---|---|---|
| GET | `/v1/clubs/{clubId}/files` | `GetClubFiles` | club member | `[]ClubFileDto` |
| POST | `/v1/clubs/{clubId}/files` | `UploadClubFile` | section `dateien` write | `ClubFileDto` |
| GET | `/v1/clubs/{clubId}/files/{fileId}` | `DownloadClubFile` | club member | binary stream |
| DELETE | `/v1/clubs/{clubId}/files/{fileId}` | `DeleteClubFile` | section `dateien` write | 204 |

Upload uses `multipart/form-data` (Fiber `c.FormFile("file")`) — read via the existing
member CSV-import handler as the reference pattern (it already does multipart). Detect
`mime_type` from the upload header, fall back to `application/octet-stream`.

Download sets `Content-Type: mime_type`, `Content-Disposition: attachment;
filename="..."`, and streams the blob with `c.Send(content)`.

Permission gating reuses membership lookup + `canWriteSection(role, "dateien")`
(Admin/CoAdmin only, per current matrix). Reads require membership only.

## Backend Tests

`tests/club_files_test.go`:
- upload as admin (multipart) → 200, file appears in list with correct size/name
- list returns metadata only (no content field)
- download returns bytes + correct content-type
- upload as plain member → 403
- oversized upload → 413
- delete → 204, gone from list

## Frontend

Regenerate types: `npm run gen:api`.

`pages/ClubDetailView.tsx`: replace the disabled "Dateien" placeholder with a real panel:
- `$api.useQuery("get", "/v1/clubs/{clubId}/files", ...)` → table (name, size formatted,
  uploader, date, download + delete actions). Reuse `components/table/DataTable.tsx`
  if it fits, else a simple list.
- "Datei hochladen" button (visible when `permissions.section_write.dateien`) opens a
  **new** `components/modals/ClubFileUploadModal.tsx` — a dedicated multipart uploader
  (drag-drop + file input, progress, error display). We do NOT reuse the note-only
  `FileUploadModal` (Redux/base64-coupled to notes); the new modal takes `clubId` as a
  prop and posts `multipart/form-data` via the `http`/`authFetch` client.
- Download: GET the file URL via authenticated fetch → blob → trigger browser download
  (anchor with object URL), since the route requires a bearer token.
- Delete confirms inline; mutations invalidate the files query key.

Size formatting helper in `utils/` (e.g. `formatBytes`).

i18n keys (`de.json` + `en.json`): `files.title`, `files.upload`, `files.empty`,
`files.col.name`, `files.col.size`, `files.col.uploadedBy`, `files.col.date`,
`files.download`, `files.delete`, `files.delete-confirm`, `files.too-large`.

## Integration / Merge

Independent track. Conflicts only on generated `schema.ts`/`swagger.json` (regen on
master after merge) and possibly `setupRouter.go` BodyLimit — keep that change minimal.
