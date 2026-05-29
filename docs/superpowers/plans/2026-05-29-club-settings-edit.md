# Club Settings Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a club leader edit a club's settings (name, type, address, visibility/messaging flags) after creation via `PATCH /v1/clubs/{clubId}`, reachable from a pre-filled form in the club detail page, and fix the club-events attendance visibility to understand the real stored tokens.

**Architecture:** Dedicated `UPDATE clubs` / `UPDATE address` queries (NOT `REPLACE INTO`, which would cascade-delete members/events). New `PATCH /v1/clubs/{clubId}` endpoint, manager-only (Admin/CoAdmin checked in the controller). Frontend reuses `BaseClubFields` shape and a shared visibility-options module; the form is wired into the existing `"bearbeiten"` section plus a gear shortcut.

**Tech Stack:** Go + Fiber v3, sqlc (MySQL), goose, React + TS, react-hook-form + zod, openapi-react-query.

---

## Conventions

- Backend commands from `api_go/`; frontend from `ui/`.
- sqlc: queries in `data/sql/queries/query.sql`, `sqlc generate` from `api_go/`, never hand-edit `db/`.
- Branch: `feat/club-settings` (already checked out; stacked on `feat/native-club-events`). Stay on it.
- Roles: `models.Admin="LEITER"`, `models.CoAdmin="CO_LEITER"`.
- Tests: `api_go/tests/` integration via `SetupTest(t)` + `app.Test` (dev user `"12345"` is Admin of clubs it creates); unit tests can live in `package service` (see existing `service/notificationHub_test.go`).
- Co-author trailer on every commit:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## File structure

**Backend:**
- Modify `data/sql/queries/query.sql` — add `UpdateClub`, `UpdateAddress`.
- Modify `api_go/service/clubService.go` — add `UpdateClub` method.
- Modify `api_go/service/clubEventService.go` — fix `visibilityAllows`.
- Create `api_go/service/clubEventVisibility_test.go` — unit test for `visibilityAllows`.
- Create `api_go/controllers/clubSettings.go` — `UpdateClub` handler.
- Modify `api_go/routers/setupRouter.go` — register `PATCH /:clubId`.
- Create `api_go/tests/club_settings_test.go` — integration test.
- `api_go/db/*`, `api_go/docs/*` — regenerated.

**Frontend:**
- Create `ui/src/models/clubSettings.ts` — shared `visibilityOptions`.
- Modify `ui/src/pages/ClubView.tsx` — import shared options.
- Create `ui/src/components/club/ClubSettingsForm.tsx` — pre-filled edit form.
- Modify `ui/src/pages/ClubDetailView.tsx` — render form in `"bearbeiten"` section + gear shortcut.
- `ui/src/api/schema.ts` — regenerated.

---

# Phase 1 — Backend

### Task 1: Add UPDATE queries + regen

**Files:** Modify `api_go/data/sql/queries/query.sql`

- [ ] **Step 1: Append queries** to the end of `query.sql`:

```sql
-- name: UpdateClub :exec
UPDATE clubs
SET name = ?, club_type = ?, dates_visible_for_all_members = ?,
    members_can_send_messages = ?, feedback_visibility = ?, reason_visibility = ?
WHERE id = ?;

-- name: UpdateAddress :exec
UPDATE address
SET street = ?, house_number = ?, location = ?, postal_code = ?, country = ?
WHERE id = ?;
```

- [ ] **Step 2: Regenerate** — `cd /c/Users/samue/GolandProjects/SmartOrganizr/api_go && sqlc generate`. Expected: clean; `db/query.sql.go` gains `UpdateClubParams` (fields `Name, ClubType, DatesVisibleForAllMembers, MembersCanSendMessages, FeedbackVisibility, ReasonVisibility, ID`) and `UpdateAddressParams` (`Street, HouseNumber, Location, PostalCode, Country, ID`).

- [ ] **Step 3: Build** — `go build ./...`. Expected: clean.

- [ ] **Step 4: Commit**
```bash
git add api_go/data/sql/queries/query.sql api_go/db/
git commit -m "feat(db): add UpdateClub and UpdateAddress queries"
```

---

### Task 2: ClubService.UpdateClub

**Files:** Modify `api_go/service/clubService.go`

- [ ] **Step 1: Add the method.** `ClubService` already has `queries *db.Queries` and `context`. `FindClubByID(ctx, clubId)` returns a row whose `.Club` has `.AddressID`. Add:

```go
func (c *ClubService) UpdateClub(clubId string, in dto.ClubPostDto) (*models.Club, error) {
	existing, err := c.queries.FindClubByID(c.context, clubId)
	if err != nil {
		return nil, err
	}

	if err := c.queries.UpdateAddress(c.context, db.UpdateAddressParams{
		Street:      in.Street,
		HouseNumber: in.HouseNumber,
		Location:    in.Location,
		PostalCode:  in.PostalCode,
		Country:     in.Country,
		ID:          existing.Club.AddressID,
	}); err != nil {
		return nil, err
	}

	if err := c.queries.UpdateClub(c.context, db.UpdateClubParams{
		Name:                      in.Name,
		ClubType:                  in.ClubType,
		DatesVisibleForAllMembers: in.DatesVisibleForAllMember,
		MembersCanSendMessages:    in.MembersCanSendMessages,
		FeedbackVisibility:        in.FeedbackVisibility,
		ReasonVisibility:          in.ReasonVisibility,
		ID:                        clubId,
	}); err != nil {
		return nil, err
	}

	updated := models.Club{
		ID:                       clubId,
		Name:                     in.Name,
		ClubType:                 in.ClubType,
		DatesVisibleForAllMember: in.DatesVisibleForAllMember,
		MembersCanSendMessages:   in.MembersCanSendMessages,
		FeedbackVisibility:       in.FeedbackVisibility,
		ReasonVisibility:         in.ReasonVisibility,
		ConfirmedRepresentative:  existing.Club.ConfirmedRepresentative,
		Address: models.Address{
			Id:          existing.Club.AddressID,
			Street:      in.Street,
			HouseNumber: in.HouseNumber,
			Location:    in.Location,
			PostalCode:  in.PostalCode,
			Country:     in.Country,
		},
	}
	return &updated, nil
}
```

> Note: `confirmed_representative` is intentionally NOT written (one-time at creation; preserved from `existing`). `UpdateClub` ignores it even though `ClubPostDto` carries it.
> Verify field names on `UpdateClubParams`/`UpdateAddressParams` against the generated `db/query.sql.go`; adjust the Go side if sqlc named them differently. Confirm `FindClubByID` returns `.Club.AddressID` (used elsewhere in the codebase).

- [ ] **Step 2: Build** — `cd /c/Users/samue/GolandProjects/SmartOrganizr/api_go && go build ./...`. Expected: clean.

- [ ] **Step 3: Commit**
```bash
git add api_go/service/clubService.go
git commit -m "feat(clubs): ClubService.UpdateClub (UPDATE not REPLACE)"
```

---

### Task 3: PATCH controller + route

**Files:** Create `api_go/controllers/clubSettings.go`; Modify `api_go/routers/setupRouter.go`

- [ ] **Step 1: Create the handler.** Mirror the manager-check pattern from `controllers/clubs.go` (`GetRoleInClub` + role check). Create `api_go/controllers/clubSettings.go`:

```go
package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/models"
	"api_go/service"

	"github.com/gofiber/fiber/v3"
)

// UpdateClub godoc
// @Summary  Update a club's settings (manager only)
// @Tags     clubs
// @Accept   json
// @Produce  json
// @Param    clubId  path  string           true  "Club ID"
// @Param    body    body  dto.ClubPostDto  true  "Club settings payload"
// @Success  200     {object} dto.ClubDto
// @Router   /v1/clubs/{clubId} [patch]
func UpdateClub(c fiber.Ctx) error {
	clubMemberService := GetLocal[service.ClubMemberService](c, constants.ClubMemberService)
	clubService := GetLocal[service.ClubService](c, constants.ClubService)
	requesterId := GetLocal[string](c, "userId")
	clubId := c.Params("clubId")

	role, err := clubMemberService.GetRoleInClub(clubId, requesterId)
	if err != nil {
		return fiber.NewError(fiber.StatusForbidden, "no club access")
	}
	if role != models.Admin && role != models.CoAdmin {
		return fiber.NewError(fiber.StatusForbidden, "insufficient role permissions")
	}

	var body dto.ClubPostDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	updated, err := clubService.UpdateClub(clubId, body)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(mappers.ConvertClubFromModelToDto(*updated))
}
```

- [ ] **Step 2: Register the route.** In `api_go/routers/setupRouter.go`, inside the `profile.Route("v1/clubs", ...)` block, add (near the other `/:clubId` routes, e.g. after `PostClub`):

```go
		r.Patch("/:clubId", controllers.UpdateClub)
```

> Caution: ensure this does not shadow `GET /:userId` (`GetAllClubsForMe`) — it won't, since that's a GET and this is a PATCH; Fiber routes by method.

- [ ] **Step 3: Build** — `cd /c/Users/samue/GolandProjects/SmartOrganizr/api_go && go build ./...`. Expected: clean.

- [ ] **Step 4: Commit**
```bash
git add api_go/controllers/clubSettings.go api_go/routers/setupRouter.go
git commit -m "feat(clubs): PATCH /v1/clubs/{clubId} settings endpoint"
```

---

### Task 4: Fix visibilityAllows (TDD)

**Files:** Modify `api_go/service/clubEventService.go`; Create `api_go/service/clubEventVisibility_test.go`

- [ ] **Step 1: Write the failing test.** Create `api_go/service/clubEventVisibility_test.go`:

```go
package service

import "testing"

func TestVisibilityAllows(t *testing.T) {
	cases := []struct {
		token     string
		isManager bool
		want      bool
	}{
		{"all-members", false, true},
		{"all-members", true, true},
		{"leaders-and-authorized", false, false},
		{"leaders-and-authorized", true, true},
		{"only-authorized", false, false},
		{"only-authorized", true, true},
		{"all", false, true},   // legacy alias
		{"", false, true},      // legacy empty
		{"self", false, false},
		{"weird-unknown", false, false}, // fail safe: restrict
		{"weird-unknown", true, true},
	}
	for _, tc := range cases {
		if got := visibilityAllows(tc.token, tc.isManager); got != tc.want {
			t.Fatalf("visibilityAllows(%q, %v) = %v, want %v", tc.token, tc.isManager, got, tc.want)
		}
	}
}
```

- [ ] **Step 2: Run, expect FAIL** — `cd /c/Users/samue/GolandProjects/SmartOrganizr/api_go && go test ./service/... -run TestVisibilityAllows`. Expected: FAIL (current `default` returns `true`, so `weird-unknown`/false wants `false` but gets `true`; and `leaders-and-authorized` falls to default→true but wants false).

- [ ] **Step 3: Replace the function.** In `api_go/service/clubEventService.go`, replace the existing `visibilityAllows`:

```go
// visibilityAllows reports whether a caller may see others' data given a club
// visibility token (as stored by the club create/settings form). Unknown,
// non-empty tokens fail safe to manager-only.
func visibilityAllows(token string, isManager bool) bool {
	switch strings.ToLower(strings.TrimSpace(token)) {
	case "", "all", "all-members":
		return true
	case "leaders-and-authorized", "only-authorized", "managers", "section": // TODO: sections — only-authorized gets a stricter rule once registers exist
		return isManager
	case "self":
		return false
	default:
		return isManager
	}
}
```

- [ ] **Step 4: Run, expect PASS** — `go test ./service/... -run TestVisibilityAllows`. Also run `go build ./...`. Expected: PASS, clean.

- [ ] **Step 5: Commit**
```bash
git add api_go/service/clubEventService.go api_go/service/clubEventVisibility_test.go
git commit -m "fix(clubs): visibilityAllows understands real form tokens"
```

---

### Task 5: Integration test

**Files:** Create `api_go/tests/club_settings_test.go`

- [ ] **Step 1: Write the test.** Reuses `createClubForTest` (dev user `"12345"` is Admin). Create `api_go/tests/club_settings_test.go`:

```go
package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

type clubSettingsResponse struct {
	ID                     string `json:"id"`
	MembersCanSendMessages bool   `json:"members_can_send_messages"`
	Name                   string `json:"name"`
}

func TestUpdateClubSettings(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)

	// createClubForTest sets members_can_send_messages:true and name "Test Club".
	// Patch: rename and turn messaging OFF, then assert the response reflects it.
	patch := `{"name":"Renamed Club","club_type":"musikverein","street":"Main","house_number":"1",` +
		`"location":"Town","postal_code":"12345","country":"DE","dates_visible_for_all_members":true,` +
		`"members_can_send_messages":false,"feedback_visibility":"leaders-and-authorized",` +
		`"reason_visibility":"leaders-and-authorized","confirmed_representative":true}`
	req, _ := http.NewRequest("PATCH", "http://localhost/api/v1/clubs/"+clubID, bytes.NewBufferString(patch))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("patch failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var updated clubSettingsResponse
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &updated); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if updated.Name != "Renamed Club" {
		t.Fatalf("expected renamed club, got %q", updated.Name)
	}
	if updated.MembersCanSendMessages != false {
		t.Fatalf("expected messaging disabled after patch, got %v", updated.MembersCanSendMessages)
	}

	// Members must survive the update (proves UPDATE, not REPLACE cascade).
	memReq, _ := http.NewRequest("GET", "http://localhost/api/v1/clubs/"+clubID+"/members", nil)
	memRes, _ := app.Test(memReq)
	if memRes.StatusCode != http.StatusOK {
		t.Fatalf("members list expected 200, got %d", memRes.StatusCode)
	}
	var members []struct {
		UserID string `json:"userId"`
	}
	memRaw, _ := io.ReadAll(memRes.Body)
	if err := json.Unmarshal(memRaw, &members); err != nil {
		t.Fatalf("decode members: %v", err)
	}
	if len(members) != 1 {
		t.Fatalf("expected creator still a member after settings update, got %d", len(members))
	}
}

func TestUpdateClubSettingsEnablesMessaging(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)

	// Turn messaging ON via PATCH, then confirm the club reflects it.
	patch := `{"name":"Test Club","club_type":"musikverein","street":"Main","house_number":"1",` +
		`"location":"Town","postal_code":"12345","country":"DE","dates_visible_for_all_members":true,` +
		`"members_can_send_messages":true,"feedback_visibility":"all-members",` +
		`"reason_visibility":"all-members","confirmed_representative":true}`
	req, _ := http.NewRequest("PATCH", "http://localhost/api/v1/clubs/"+clubID, bytes.NewBufferString(patch))
	req.Header.Set("Content-Type", "application/json")
	res, _ := app.Test(req)
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var updated clubSettingsResponse
	raw, _ := io.ReadAll(res.Body)
	_ = json.Unmarshal(raw, &updated)
	if !updated.MembersCanSendMessages {
		t.Fatalf("expected messaging enabled after patch")
	}
}
```

> The `ClubMemberDto` JSON field for the member id is `userId` (confirmed in `controllers/clubs.go` `GetClubMembers`). If the assertion fails on shape, re-check that DTO.

- [ ] **Step 2: Run** — `cd /c/Users/samue/GolandProjects/SmartOrganizr/api_go && go test ./tests/... -run 'TestUpdateClubSettings' -v`.
  - PASS → done.
  - FAILS due to no Docker (testcontainers) → report DONE_WITH_CONCERNS; confirm `go vet ./tests/...` is clean.

- [ ] **Step 3: Commit**
```bash
git add api_go/tests/club_settings_test.go
git commit -m "test(clubs): integration test for club settings update"
```

---

### Task 6: Regenerate swagger

**Files:** Modify `api_go/docs/*`

- [ ] **Step 1: Regenerate** — `cd /c/Users/samue/GolandProjects/SmartOrganizr/api_go && swag init -g main.go` (the established command; swag is installed at `~/go/bin/swag`). If unavailable, report DONE_WITH_CONCERNS.

- [ ] **Step 2: Verify** — Grep `docs/swagger.json` for `"/v1/clubs/{clubId}"` with a `patch` entry. Run `go build ./...`.

- [ ] **Step 3: Commit**
```bash
git add api_go/docs/
git commit -m "docs(api): regenerate swagger for club settings patch"
```

> **Backend independently shippable here.**

---

# Phase 2 — Frontend

### Task 7: Regenerate UI schema

**Files:** Modify `ui/src/api/schema.ts`

- [ ] **Step 1: Regenerate** — `cd /c/Users/samue/GolandProjects/SmartOrganizr/ui && npm run gen:api`.
- [ ] **Step 2: Verify** the `patch` operation on `/v1/clubs/{clubId}` exists in `ui/src/api/schema.ts` (Grep). Run `npx tsc --noEmit -p tsconfig.json` — no new errors.
- [ ] **Step 3: Commit**
```bash
git add ui/src/api/schema.ts api_go/docs/openapi.json
git commit -m "chore(ui): regenerate api schema for club settings patch"
```

---

### Task 8: Shared visibility-options module

**Files:** Create `ui/src/models/clubSettings.ts`; Modify `ui/src/pages/ClubView.tsx`

- [ ] **Step 1: Create the module.** Create `ui/src/models/clubSettings.ts`:

```ts
export const visibilityOptions = [
  "leaders-and-authorized",
  "all-members",
  "only-authorized",
] as const

export type VisibilityOption = (typeof visibilityOptions)[number]
```

- [ ] **Step 2: Use it in `ClubView.tsx`.** In `ui/src/pages/ClubView.tsx`, remove the local `const visibilityOptions = [...] as const` declaration and import the shared one instead:

```tsx
import { visibilityOptions } from "@/src/models/clubSettings"
```
Leave all other usages (`z.enum(visibilityOptions)`, the `.map`) unchanged — they keep working against the imported tuple.

- [ ] **Step 3: Typecheck** — `cd /c/Users/samue/GolandProjects/SmartOrganizr/ui && npx tsc --noEmit -p tsconfig.json`. Expected: clean.

- [ ] **Step 4: Commit**
```bash
git add ui/src/models/clubSettings.ts ui/src/pages/ClubView.tsx
git commit -m "refactor(ui): share visibilityOptions between create and edit"
```

---

### Task 9: ClubSettingsForm component

**Files:** Create `ui/src/components/club/ClubSettingsForm.tsx`

- [ ] **Step 1: Create the component.** Pre-fills from the passed `club` and PATCHes on submit. Verify the `$api.useMutation("patch", ...)` shape against `ui/src/components/club/ClubEventsManager.tsx` / `ClubEventResponseControls.tsx`, and the form/Select/Checkbox imports against `ClubView.tsx`. Create `ui/src/components/club/ClubSettingsForm.tsx`:

```tsx
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { $api } from "@/src/api/client"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { visibilityOptions } from "@/src/models/clubSettings"
import { Club } from "@/src/models/Club"

type Props = { club: Club }

export const ClubSettingsForm = ({ club }: Props) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const schema = z.object({
    name: z.string().min(1),
    club_type: z.string().min(1),
    street: z.string().min(1),
    house_number: z.string(),
    location: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().min(1),
    dates_visible_for_all_members: z.boolean(),
    members_can_send_messages: z.boolean(),
    feedback_visibility: z.enum(visibilityOptions),
    reason_visibility: z.enum(visibilityOptions),
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: club.name,
      club_type: club.club_type,
      street: club.street,
      house_number: club.house_number,
      location: club.location,
      postal_code: club.postal_code,
      country: club.country,
      dates_visible_for_all_members: club.dates_visible_for_all_members,
      members_can_send_messages: club.members_can_send_messages,
      feedback_visibility: (visibilityOptions as readonly string[]).includes(club.feedback_visibility)
        ? (club.feedback_visibility as (typeof visibilityOptions)[number])
        : "leaders-and-authorized",
      reason_visibility: (visibilityOptions as readonly string[]).includes(club.reason_visibility)
        ? (club.reason_visibility as (typeof visibilityOptions)[number])
        : "leaders-and-authorized",
    },
  })

  const mutation = $api.useMutation("patch", "/v1/clubs/{clubId}", {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clubs"] })
    },
  })

  const onSubmit = (values: z.infer<typeof schema>) => {
    mutation.mutate({
      params: { path: { clubId: club.id } },
      body: { ...values, confirmed_representative: true },
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>{t("club-name") || "Name"}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField control={form.control} name="street" render={({ field }) => (
            <FormItem><FormLabel>Straße</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="house_number" render={({ field }) => (
            <FormItem><FormLabel>Nr.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="postal_code" render={({ field }) => (
            <FormItem><FormLabel>PLZ</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem><FormLabel>Ort</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="country" render={({ field }) => (
            <FormItem><FormLabel>Land</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        <FormField control={form.control} name="dates_visible_for_all_members" render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            <FormLabel className="!mt-0">Termine für alle Mitglieder sichtbar</FormLabel>
          </FormItem>
        )} />
        <FormField control={form.control} name="members_can_send_messages" render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            <FormLabel className="!mt-0">Mitglieder dürfen Nachrichten senden</FormLabel>
          </FormItem>
        )} />

        <FormField control={form.control} name="feedback_visibility" render={({ field }) => (
          <FormItem>
            <FormLabel>Sichtbarkeit der Rückmeldungen</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                {visibilityOptions.map((o) => (<SelectItem key={o} value={o}>{t(`club-visibility-${o}`)}</SelectItem>))}
              </SelectContent>
            </Select>
          </FormItem>
        )} />
        <FormField control={form.control} name="reason_visibility" render={({ field }) => (
          <FormItem>
            <FormLabel>Sichtbarkeit der Gründe</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                {visibilityOptions.map((o) => (<SelectItem key={o} value={o}>{t(`club-visibility-${o}`)}</SelectItem>))}
              </SelectContent>
            </Select>
          </FormItem>
        )} />

        <Button type="submit" disabled={mutation.isPending}>Speichern</Button>
        {mutation.isSuccess && <p className="text-sm text-green-600">Gespeichert.</p>}
      </form>
    </Form>
  )
}
```

> If the generated `patch` body type rejects extra/missing fields, align the `body` object to the schema's required keys. `confirmed_representative: true` is sent to satisfy the shared `BaseClubFields` shape; the backend preserves the real value and ignores this.

- [ ] **Step 2: Typecheck** — `cd /c/Users/samue/GolandProjects/SmartOrganizr/ui && npx tsc --noEmit -p tsconfig.json`. Fix until clean.

- [ ] **Step 3: Commit**
```bash
git add ui/src/components/club/ClubSettingsForm.tsx
git commit -m "feat(ui): pre-filled club settings edit form"
```

---

### Task 10: Wire into ClubDetailView (section + gear)

**Files:** Modify `ui/src/pages/ClubDetailView.tsx`

- [ ] **Step 1: Import** the form and a gear icon. Add near the other imports:

```tsx
import { ClubSettingsForm } from "@/src/components/club/ClubSettingsForm";
import { Settings } from "lucide-react";
```

- [ ] **Step 2: Render the form in the `"bearbeiten"` section.** The component already computes `club`, `permissions`, and renders sections by `activeSection.id`. Add a block alongside the other `activeSection.id === ...` blocks (e.g. after the `"termine"` block):

```tsx
                    {activeSection.id === "bearbeiten" && club && (
                        permissions?.can_manage_roles
                            ? <ClubSettingsForm club={club} />
                            : <p className="text-sm text-muted-foreground">Nur die Vereinsleitung kann Einstellungen bearbeiten.</p>
                    )}
```

- [ ] **Step 3: Exclude `"bearbeiten"` from the fallback card.** Find the fallback condition (currently:
`activeSection.id !== "rollen" && ... && activeSection.id !== "termine"`). Add ` && activeSection.id !== "bearbeiten"` to it so the placeholder card no longer shows for this section.

- [ ] **Step 4: Add the gear shortcut in the header.** Near the club title/header (where `club.name` is rendered), add a manager-only button that switches the section:

```tsx
                    {permissions?.can_manage_roles && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSearchParams({ section: "bearbeiten" })}
                        >
                            <Settings className="size-4" />
                        </Button>
                    )}
```

> `setSearchParams` is already in scope (`const [searchParams, setSearchParams] = useSearchParams()`). `Button` is already imported in this file. Place the gear button sensibly in the header row next to the club name — read the surrounding JSX to slot it in cleanly.

- [ ] **Step 5: Typecheck + build** — `cd /c/Users/samue/GolandProjects/SmartOrganizr/ui && npx tsc --noEmit -p tsconfig.json && npm run build`. Both must pass. Fix until clean.

- [ ] **Step 6: Commit**
```bash
git add ui/src/pages/ClubDetailView.tsx
git commit -m "feat(ui): wire club settings form into bearbeiten section + gear shortcut"
```

---

## Self-review notes

- **Spec coverage:** UPDATE-not-REPLACE (Tasks 1,2 + test 5 members-survive), PATCH endpoint manager-only (Task 3), visibility-token fix incl. `all` alias + fail-safe default (Task 4 unit test), pre-filled form (Task 9), section + gear navigation (Task 10), shared visibility module (Task 8), editable fields minus `confirmed_representative` (UpdateClub query omits it; form omits it, sends `true` passthrough).
- **DTO reuse:** PATCH body is `dto.ClubPostDto` (= `BaseClubFields`); `confirmed_representative` is carried but ignored by `UpdateClub`. Validation is not enforced on `Bind` (the create flow already posts `false` bools successfully), so the `required` tags don't block the PATCH.
- **Type consistency:** `UpdateClubParams`/`UpdateAddressParams` field names per sqlc generation (Task 1) are used verbatim in Task 2 — verify against generated code and adjust Go side only.
- **Navigation:** reuses the existing `"bearbeiten"` `CLUB_SECTIONS` entry (no new section object); gear sets `?section=bearbeiten`.
- **Permission:** `can_manage_roles` (Admin/CoAdmin) gates UI; controller enforces Admin/CoAdmin server-side.
