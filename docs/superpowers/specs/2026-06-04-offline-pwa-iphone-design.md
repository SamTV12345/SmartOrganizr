# Offline PWA for iPhone — Design

- **Date:** 2026-06-04
- **Status:** Approved (design); pending implementation plan
- **Scope:** `ui/` (frontend) + one small change in `api_go/controllers/user.go`

## 1. Goal

Turn the SmartOrganizr web UI into an installable Progressive Web App so it can be added to
the iPhone home screen and **opened and used with no network connection** — no Apple Developer
account, no App Store. Offline, the user can browse their folder tree, open note metadata, and
search their authors/notes. This avoids needing the native mobile app for a basic offline
experience.

## 2. Locked decisions

| Decision | Choice |
| --- | --- |
| Offline data scope | **Full local sync** of all the user's metadata (authors, notes, folder tree). |
| Content | **Metadata only.** No sheet-music PDFs offline. |
| Search offline | **Client-side** substring search over the local store (server search is unreachable offline). |
| Offline auth gate | **None.** Show cached data directly; metadata is not sensitive. The PWA already sits behind the iOS device lock. |
| Offline writes | **None — read-only offline.** Create/edit/delete require a connection. |
| Sync architecture | **One bulk endpoint, full-replace** into local storage. The endpoint (`GET /v1/users/offline`) already exists. |

## 3. Non-goals

- No offline PDF/sheet-music viewing.
- No offline create/edit/delete and no offline write queue or sync-on-reconnect.
- No delta/incremental sync, no `updated_at` columns, no DB migration.
- No app-level PIN/biometric/Face ID gate.
- No push notifications or background sync.

## 4. Current-state findings (grounding)

- **Frontend:** React 19 SPA built with **Rsbuild** (not Vite, despite a leftover `vite.svg`).
  Auth via `keycloak-js`; data via a mix of typed `$api` (openapi-react-query) and a legacy
  `http`/axios shim (`ui/src/api/client.ts`) that writes into Redux.
- **Author search is server-side:** `ui/src/components/searchBars/AuthorSearchBar.tsx` calls
  `/v1/authors?page=0&name=<text>` and dispatches the result into Redux — not through React
  Query. So React Query persistence alone cannot cover it; offline search must run against a
  local store.
- **No PWA assets today:** no manifest, no service worker. `QueryClient.ts` is a bare
  `new QueryClient()`.
- **App cannot boot offline today.** `ui/src/index.tsx` `bootstrapApp()` first does
  `axios.get("/../public")` for the Keycloak config, *then* `keycloak.init({onLoad:"login-required"})`.
  With no network the config fetch rejects, the chain never reaches `renderApp`, and
  `login-required` would otherwise redirect to the Keycloak login page.
- **Bulk endpoint already exists:** `GET /v1/users/offline` → `controllers.GetOfflineData`
  (`api_go/controllers/user.go`) returns `{authors, folders, notes}` in one payload.
- **PDF-bloat problem (confirmed):** `GetOfflineData` returns raw `models.*`. `models.Note`
  has `PDFContent []byte` tagged `json:"pdfContent"` (no `omitempty`), and the underlying query
  `FindAllNotesByCreator` uses `sqlc.embed(note)` which selects every `elements` column including
  the PDF blob (`NoteMapper` copies it into `PDFContent`). **Today the offline payload base64-encodes
  every note's full PDF** — must be fixed for the metadata-only goal.
- **Model field names match the DTOs** the UI renders, so once PDF bytes are removed the payload
  is directly consumable.

## 5. Architecture

A **frontend-only PWA conversion** plus one small backend fix. Three concerns:

1. **Installable offline shell** — web manifest + service worker (precached app shell).
2. **Local data store + sync** — pull the bulk payload into IndexedDB while online; read it offline.
3. **Offline-aware boot, browse, and search** — render offline and serve reads from the local store.

### Data flow

- **Online, on app load** (and via a manual "Sync now"): `GET /v1/users/offline` →
  full-replace the IndexedDB stores → stamp `lastSyncedAt`.
- **Reads while online:** unchanged — hit the server as today.
- **Reads while offline:** a fallback layer reads from IndexedDB and filters client-side.
- **PDF while offline:** skip the `/:noteId/pdf` fetch; show a "connect to view sheet music" placeholder.
- **Writes while offline:** disabled (read-only) — create/edit/delete actions hidden or disabled with a hint.

## 6. Backend change (required, small)

**File:** `api_go/controllers/user.go` → `GetOfflineData`.

Return the payload through the existing DTO mappers instead of raw models:

- `mappers.ConvertAuthorDtoFromModel`
- `mappers.ConvertFolderDtoFromModel`
- `mappers.ConvertNoteDtoFromModel`

So `DataExporter` becomes `{authors []dto.Author, folders []dto.Folder, notes []dto.Note}`.
`dto.Note` has no `pdfContent` field, so this (a) strips the PDF blob from the payload and
(b) makes the payload exactly match the shapes the frontend already renders (no client-side
`models→dto` mapping needed).

Also update the Swagger annotation from `map[string]interface{}` to the typed `DataExporter`
struct and regenerate the OpenAPI types (`pnpm gen:api` / `npm run gen:api`) so the frontend
gets a typed `/v1/users/offline` response instead of `{ [key: string]: unknown }`.

**Optional follow-up (not required now):** the PDF blob is still loaded from the DB into memory
via `sqlc.embed(note)` even though it is no longer serialized. A dedicated query that omits the
blob column would save server memory/DB transfer. Deferred — not needed for correctness at this
data size.

## 7. Frontend components

New/changed files under `ui/`:

### 7.1 PWA shell
- **`ui/public/manifest.webmanifest`** — `name`, `short_name`, `start_url` (`/ui/`),
  `display: "standalone"`, `theme_color`, `background_color`, and `icons` (192/512 PNG + maskable).
- **App icons** — generate from existing branding (e.g. `package.svg`); add PNG sizes for
  Android/iOS plus an `apple-touch-icon`.
- **`ui/index.html`** — add `<link rel="manifest" href="/manifest.webmanifest">`,
  `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`,
  `apple-mobile-web-app-title`, and `apple-touch-icon`.

### 7.2 Service worker
- Use Rsbuild's Workbox integration (`@rsbuild/plugin-pwa` or a Workbox plugin) to **precache the
  built app shell** (JS/CSS/HTML/icons), with a **navigation fallback to `index.html`** (SPA routing).
- Runtime-cache the `GET /public` config response so the Keycloak config is available offline.
- Do **not** runtime-cache API data through the service worker — data lives in IndexedDB so it is queryable.
- `skipWaiting` + `clientsClaim`, plus a lightweight "new version available — reload" prompt so the
  installed app does not get stuck on stale assets.
- Register the service worker from `ui/src/index.tsx` (production only).

### 7.3 Local store — `ui/src/offline/offlineDb.ts`
- IndexedDB via the small `idb` library.
- Object stores: `authors`, `notes`, `folders` (keyed by `id`) + a `meta` store (`lastSyncedAt`).
- Helpers: `replaceAll(store, items)`, `getAll(store)`, `get(store, id)`, `getMeta()/setMeta()`.

### 7.4 Sync — `ui/src/offline/offlineSync.ts`
- `syncNow()`: when online, `GET /v1/users/offline`, then full-replace all three stores in a
  single transaction and stamp `lastSyncedAt`. On any failure, **leave existing data intact**
  (replace only on a fully successful fetch) and surface a non-blocking toast.
- Triggered automatically on app load when online; also exposed as a manual "Sync now" action.

### 7.5 Network status — `ui/src/offline/useOnlineStatus.ts`
- Combines `navigator.onLine`, `online`/`offline` events, and observed fetch failures.
- Drives the offline read branches and an "Offline — showing your downloaded library" banner.

### 7.6 Offline-aware read branches (targeted edits)
- **`AuthorSearchBar.tsx`** — offline branch reads `authors` from IndexedDB, filters by
  case-insensitive substring on `name` (matching the server's `LIKE CONCAT('%',?,'%')` under
  `utf8mb4_general_ci`), and dispatches into Redux exactly as today.
- **Folder browse** — offline branches for the calls behind `GetParentDecks`
  (`/v1/elements/parentDecks`), `FindNextChildren` (`/v1/elements/:folderId/children`), and
  `GetNotes` (`/v1/elements/notes`). Reconstruct the tree from the flat IndexedDB arrays via
  `parent` links: roots = folders with no parent; children of `X` = folders/notes whose
  `parent.id === X`.
- **Note detail view** — offline branch renders metadata from IndexedDB; the PDF region shows the
  placeholder instead of fetching `/v1/elements/:noteId/pdf`.

## 8. Offline boot sequence (`ui/src/index.tsx`)

1. Attempt `GET /public` (Keycloak config) with a short timeout.
   - **Success:** cache `{clientId, realm, url}` to `localStorage`; proceed with online Keycloak
     init as today.
   - **Failure (offline):** read cached config from `localStorage`.
2. If offline **and** cached config exists **and** `lastSyncedAt` is set → render the app in
   **offline mode**: skip `keycloak.init({onLoad:"login-required"})` (no redirect), set an
   `offline` flag in app state, serve reads from IndexedDB.
3. If offline and (no cached config **or** never synced) → render a "Connect once to download your
   library" empty state.
4. Ensure `initKeycloak` **always resolves** so `renderApp` runs even when init fails.
5. The token-refresh interval runs **only when online and authenticated**.

## 9. UI / UX states

- **Offline banner:** "Offline — showing your downloaded library" + "last synced <relative time>".
- **PDF offline:** placeholder card "Connect to view sheet music."
- **Read-only offline:** create/edit/delete controls hidden or disabled with a tooltip.
- **Never-synced offline:** full-screen empty state prompting one online sync.
- **App update available:** small reload prompt.

## 10. Error handling & edge cases

- **Sync failure online:** keep prior cached data; toast; no store wipe.
- **Token expired offline:** fine — no server calls. On reconnect, `keycloak.updateToken`
  refreshes; only force re-login when an online action actually needs it.
- **Partial/corrupt payload:** validate the three arrays exist before replacing; otherwise abort
  the replace and keep prior data.
- **Storage/eviction:** metadata is tiny (a few MB even for thousands of records); home-screen
  install exempts it from Safari's ~7-day eviction of unused-site storage.
- **Service-worker staleness:** handled by `skipWaiting`/`clientsClaim` + reload prompt.

## 11. iOS-specific constraints (informational)

- Service workers + Add to Home Screen + standalone display are supported (iOS 11.3+).
- Must be served over HTTPS.
- No Background Sync API on iOS (acceptable — offline is read-only; sync happens on next online open).
- WebAuthn in standalone PWAs is historically flaky on iOS — intentionally avoided (no app-level gate).

## 12. Testing strategy

- **Unit:** `offlineDb` replace/get/round-trip; client-side author filter matches server
  `name`-contains semantics (case-insensitive); offline tree reconstruction from flat arrays.
- **Integration:** mock `GET /v1/users/offline`, run `syncNow()`, assert stores populated and
  `lastSyncedAt` stamped; assert a failing sync preserves prior data; assert offline read branches
  return local data.
- **Backend:** assert the `/v1/users/offline` JSON contains no `pdfContent` field after the
  mapper change.
- **Manual on iPhone:** install to home screen → airplane mode → cold-launch renders → browse
  folders → search authors → open note metadata → see PDF placeholder.
- **Tooling:** Lighthouse PWA/installability audit; desktop DevTools "offline" service-worker test first.

## 13. File-change summary

**Backend**
- `api_go/controllers/user.go` — `GetOfflineData` returns DTOs via existing mappers; typed
  `DataExporter`; updated Swagger annotation.
- Regenerate OpenAPI types (`gen:api`).

**Frontend (new)**
- `ui/public/manifest.webmanifest` + icons
- `ui/src/offline/offlineDb.ts`
- `ui/src/offline/offlineSync.ts`
- `ui/src/offline/useOnlineStatus.ts`
- Service-worker config (Rsbuild Workbox plugin) + registration

**Frontend (edited)**
- `ui/index.html` — manifest + iOS meta tags
- `ui/src/index.tsx` — offline boot sequence + SW registration
- `ui/src/components/searchBars/AuthorSearchBar.tsx` — offline search branch
- Folder browse + note-detail data calls — offline read branches
- Offline banner / read-only gating in shared layout

## 14. Open risks

- Exact Rsbuild PWA/Workbox plugin choice and config (resolve during implementation).
- Confirming all browse call sites that need an offline branch (folder tree, note detail,
  author search are the known ones; an audit pass during implementation will catch any others).
