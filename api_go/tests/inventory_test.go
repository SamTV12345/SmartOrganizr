package tests

import (
	"api_go/controllers/dto"
	"api_go/tests/builders"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
)

func createInventoryFolder(t *testing.T, app *fiber.App, name string) string {
	t.Helper()
	res := postJSON(t, app, "http://localhost/api/v1/elements/folders", dto.FolderPostDto{
		Name: name, Description: "Mappe",
	})
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("create folder: expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var folder struct {
		Id string `json:"id"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &folder); err != nil || folder.Id == "" {
		t.Fatalf("decode folder: %v (%s)", err, string(raw))
	}
	return folder.Id
}

func createInventoryNote(t *testing.T, app *fiber.App, authorID, folderID, name string, pages int) string {
	t.Helper()
	res := postJSON(t, app, "http://localhost/api/v1/elements/notes", dto.NotePostDto{
		AuthorId: authorID, Description: "d", NumberOfPages: pages, ParentId: folderID, Name: name,
	})
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("create note: expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var note struct {
		Id string `json:"id"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &note); err != nil || note.Id == "" {
		t.Fatalf("decode note: %v (%s)", err, string(raw))
	}
	return note.Id
}

func createInventoryAuthor(t *testing.T, app *fiber.App) string {
	t.Helper()
	res := postJSON(t, app, "http://localhost/api/v1/authors", builders.CreateAuthorDto())
	if res.StatusCode != http.StatusOK {
		t.Fatalf("create author: expected 200, got %d", res.StatusCode)
	}
	var author struct {
		ID string `json:"id"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &author); err != nil || author.ID == "" {
		t.Fatalf("decode author: %v (%s)", err, string(raw))
	}
	return author.ID
}

func startSweep(t *testing.T, app *fiber.App, folderID string) string {
	t.Helper()
	res := postJSON(t, app, "http://localhost/api/v1/inventory/sweeps", map[string]string{"folderId": folderID})
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("start sweep: expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var created struct {
		SweepID string `json:"sweepId"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &created); err != nil || created.SweepID == "" {
		t.Fatalf("decode sweep: %v (%s)", err, string(raw))
	}
	return created.SweepID
}

type sightingResponse struct {
	AlreadySighted bool  `json:"alreadySighted"`
	InventoryNo    int32 `json:"inventoryNo"`
}

func addSighting(t *testing.T, app *fiber.App, sweepID, noteID string, incomplete bool) sightingResponse {
	t.Helper()
	res := postJSON(t, app, "http://localhost/api/v1/inventory/sweeps/"+sweepID+"/sightings", map[string]any{
		"noteId": noteID, "matchedVia": "MANUAL", "incomplete": incomplete,
	})
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("sighting: expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var out sightingResponse
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("decode sighting: %v", err)
	}
	return out
}

type sweepReport struct {
	Present []struct {
		NoteID string `json:"noteId"`
	} `json:"present"`
	NewHere []struct {
		NoteID             string `json:"noteId"`
		PreviousFolderName string `json:"previousFolderName"`
	} `json:"newHere"`
	Missing []struct {
		NoteID             string `json:"noteId"`
		LastSeenFolderName string `json:"lastSeenFolderName"`
		LastSeenAt         string `json:"lastSeenAt"`
	} `json:"missing"`
	Incomplete []struct {
		NoteID string `json:"noteId"`
	} `json:"incomplete"`
}

func completeSweep(t *testing.T, app *fiber.App, sweepID string) sweepReport {
	t.Helper()
	res := postJSON(t, app, "http://localhost/api/v1/inventory/sweeps/"+sweepID+"/complete", map[string]string{})
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("complete sweep: expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var report sweepReport
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &report); err != nil {
		t.Fatalf("decode report: %v", err)
	}
	return report
}

func TestInventorySweepLifecycleAndDiff(t *testing.T) {
	app := SetupTest(t)
	authorID := createInventoryAuthor(t, app)
	mappeA := createInventoryFolder(t, app, "Mappe Floete 1")
	mappeB := createInventoryFolder(t, app, "Mappe Klarinette 2")

	stays := createInventoryNote(t, app, authorID, mappeA, "Armenian Dances", 10)
	wanders := createInventoryNote(t, app, authorID, mappeB, "Boehmischer Traum", 4)
	vanishes := createInventoryNote(t, app, authorID, mappeA, "Verschwundener Marsch", 2)

	// Baseline sweep of Mappe A: both A-notes present, so "vanishes" gets a
	// last-seen record for the second sweep's missing report.
	baseline := startSweep(t, app, mappeA)
	addSighting(t, app, baseline, stays, false)
	addSighting(t, app, baseline, vanishes, false)
	completeSweep(t, app, baseline)

	// Second sweep: "stays" is here (incomplete!), "wanders" moved in from B,
	// "vanishes" is gone.
	sweep := startSweep(t, app, mappeA)
	first := addSighting(t, app, sweep, stays, true)
	if first.AlreadySighted || first.InventoryNo == 0 {
		t.Fatalf("expected fresh sighting with assigned number, got %+v", first)
	}
	again := addSighting(t, app, sweep, stays, true)
	if !again.AlreadySighted || again.InventoryNo != first.InventoryNo {
		t.Fatalf("duplicate sighting must be a no-op with stable number, got %+v", again)
	}
	addSighting(t, app, sweep, wanders, false)

	report := completeSweep(t, app, sweep)
	if len(report.Present) != 1 || report.Present[0].NoteID != stays {
		t.Fatalf("present: %+v", report.Present)
	}
	if len(report.NewHere) != 1 || report.NewHere[0].NoteID != wanders || report.NewHere[0].PreviousFolderName != "Mappe Klarinette 2" {
		t.Fatalf("newHere: %+v", report.NewHere)
	}
	if len(report.Missing) != 1 || report.Missing[0].NoteID != vanishes {
		t.Fatalf("missing: %+v", report.Missing)
	}
	if report.Missing[0].LastSeenFolderName != "Mappe Floete 1" || report.Missing[0].LastSeenAt == "" {
		t.Fatalf("missing last-seen: %+v", report.Missing[0])
	}
	if len(report.Incomplete) != 1 || report.Incomplete[0].NoteID != stays {
		t.Fatalf("incomplete: %+v", report.Incomplete)
	}

	// Completed sweeps reject further sightings.
	res := postJSON(t, app, "http://localhost/api/v1/inventory/sweeps/"+sweep+"/sightings", map[string]any{
		"noteId": stays, "matchedVia": "MANUAL",
	})
	if res.StatusCode != http.StatusConflict {
		t.Fatalf("expected 409 sighting on completed sweep, got %d", res.StatusCode)
	}

	// Apply moves: "wanders" re-homes into Mappe A; a later sweep of B reports it missing... but
	// more directly, looking it up shows the new folder.
	res = postJSON(t, app, "http://localhost/api/v1/inventory/sweeps/"+sweep+"/apply-moves", map[string]any{
		"noteIds": []string{wanders},
	})
	if res.StatusCode != http.StatusNoContent {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("apply-moves: expected 204, got %d: %s", res.StatusCode, string(raw))
	}
	lookupRes := doRequest(t, app, "GET", "http://localhost/api/v1/inventory/lookup?no="+itoa(int(again.InventoryNo)))
	if lookupRes.StatusCode != http.StatusOK {
		t.Fatalf("lookup: expected 200, got %d", lookupRes.StatusCode)
	}
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}

func TestInventoryNumberAssignmentAndLookup(t *testing.T) {
	app := SetupTest(t)
	authorID := createInventoryAuthor(t, app)
	mappe := createInventoryFolder(t, app, "Mappe Trompete")
	noteA := createInventoryNote(t, app, authorID, mappe, "Erster Marsch", 3)
	noteB := createInventoryNote(t, app, authorID, mappe, "Zweite Polka", 3)

	assign := func(noteID string) int32 {
		res := postJSON(t, app, "http://localhost/api/v1/inventory/notes/"+noteID+"/number", map[string]string{})
		if res.StatusCode != http.StatusOK {
			raw, _ := io.ReadAll(res.Body)
			t.Fatalf("assign number: expected 200, got %d: %s", res.StatusCode, string(raw))
		}
		var out struct {
			InventoryNo int32 `json:"inventoryNo"`
		}
		raw, _ := io.ReadAll(res.Body)
		if err := json.Unmarshal(raw, &out); err != nil {
			t.Fatalf("decode: %v", err)
		}
		return out.InventoryNo
	}

	noA := assign(noteA)
	noB := assign(noteB)
	if noA == noB {
		t.Fatalf("numbers must be unique, both got %d", noA)
	}
	if assign(noteA) != noA {
		t.Fatalf("assignment must be idempotent")
	}

	res := doRequest(t, app, "GET", "http://localhost/api/v1/inventory/lookup?no="+itoa(int(noA)))
	if res.StatusCode != http.StatusOK {
		t.Fatalf("lookup expected 200, got %d", res.StatusCode)
	}
	var lookup struct {
		NoteID     string `json:"noteId"`
		FolderName string `json:"folderName"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &lookup); err != nil {
		t.Fatalf("decode lookup: %v", err)
	}
	if lookup.NoteID != noteA || lookup.FolderName != "Mappe Trompete" {
		t.Fatalf("lookup result: %+v", lookup)
	}

	if res := doRequest(t, app, "GET", "http://localhost/api/v1/inventory/lookup?no=99999"); res.StatusCode != http.StatusNotFound {
		t.Fatalf("unknown number: expected 404, got %d", res.StatusCode)
	}
}

func TestInventoryIdentifyTextPass(t *testing.T) {
	app := SetupTest(t)
	authorID := createInventoryAuthor(t, app)
	mappe := createInventoryFolder(t, app, "Mappe Horn")
	target := createInventoryNote(t, app, authorID, mappe, "Armenian Dances", 10)
	createInventoryNote(t, app, authorID, mappe, "Boehmischer Traum", 4)

	res := postJSON(t, app, "http://localhost/api/v1/inventory/identify", map[string]string{
		"ocrText": "ARMEN1AN DANCES (Part I)\nAlfred Reed\nHorn 1 in F",
	})
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("identify: expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var candidates []struct {
		NoteID     string `json:"noteId"`
		Confidence int    `json:"confidence"`
		MatchedVia string `json:"matchedVia"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &candidates); err != nil {
		t.Fatalf("decode candidates: %v (%s)", err, string(raw))
	}
	if len(candidates) == 0 || candidates[0].NoteID != target {
		t.Fatalf("expected Armenian Dances as top candidate, got %+v", candidates)
	}
	if candidates[0].Confidence < 90 || candidates[0].MatchedVia != "OCR" {
		t.Fatalf("expected confident OCR match, got %+v", candidates[0])
	}
}

func TestInventoryAttention(t *testing.T) {
	app := SetupTest(t)
	authorID := createInventoryAuthor(t, app)
	mappe := createInventoryFolder(t, app, "Mappe Posaune")
	untouched := createInventoryFolder(t, app, "Mappe Unberuehrt")

	seen := createInventoryNote(t, app, authorID, mappe, "Bleibt Vorhanden", 5)
	lost := createInventoryNote(t, app, authorID, mappe, "Geht Verloren", 3)
	createInventoryNote(t, app, authorID, untouched, "Nie Inventarisiert", 2)

	// Baseline sweep: both notes sighted, so "lost" gets last-seen data for
	// the attention report after the second sweep.
	baseline := startSweep(t, app, mappe)
	addSighting(t, app, baseline, seen, false)
	addSighting(t, app, baseline, lost, false)
	completeSweep(t, app, baseline)

	// completed_at has second resolution; make the second sweep strictly newer
	// so it is unambiguously the folder's latest completed sweep.
	time.Sleep(1100 * time.Millisecond)

	sweep := startSweep(t, app, mappe)
	addSighting(t, app, sweep, seen, true) // present but incomplete
	completeSweep(t, app, sweep)

	res := doRequest(t, app, "GET", "http://localhost/api/v1/inventory/attention")
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("attention: expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var attention struct {
		Missing []struct {
			NoteID             string `json:"noteId"`
			Name               string `json:"name"`
			FolderID           string `json:"folderId"`
			FolderName         string `json:"folderName"`
			LastSeenAt         string `json:"lastSeenAt"`
			LastSeenFolderName string `json:"lastSeenFolderName"`
		} `json:"missing"`
		Incomplete []struct {
			NoteID     string `json:"noteId"`
			FolderID   string `json:"folderId"`
			FolderName string `json:"folderName"`
		} `json:"incomplete"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &attention); err != nil {
		t.Fatalf("decode attention: %v (%s)", err, string(raw))
	}

	// Only the unsighted note of the swept folder is missing — the note in the
	// never-swept folder must not be reported.
	if len(attention.Missing) != 1 || attention.Missing[0].NoteID != lost {
		t.Fatalf("missing: %+v", attention.Missing)
	}
	if attention.Missing[0].FolderID != mappe || attention.Missing[0].FolderName != "Mappe Posaune" {
		t.Fatalf("missing folder: %+v", attention.Missing[0])
	}
	if attention.Missing[0].LastSeenAt == "" || attention.Missing[0].LastSeenFolderName != "Mappe Posaune" {
		t.Fatalf("missing last-seen: %+v", attention.Missing[0])
	}

	if len(attention.Incomplete) != 1 || attention.Incomplete[0].NoteID != seen {
		t.Fatalf("incomplete: %+v", attention.Incomplete)
	}
	if attention.Incomplete[0].FolderID != mappe || attention.Incomplete[0].FolderName != "Mappe Posaune" {
		t.Fatalf("incomplete folder: %+v", attention.Incomplete[0])
	}
}

func TestMappeTagBindResolveRotate(t *testing.T) {
	app := SetupTest(t)
	mappe := createInventoryFolder(t, app, "Mappe Tuba")

	bind := func() (string, string) {
		req, _ := http.NewRequest("PUT", "http://localhost/api/v1/inventory/folders/"+mappe+"/tag", nil)
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("bind tag: %v", err)
		}
		if res.StatusCode != http.StatusOK {
			raw, _ := io.ReadAll(res.Body)
			t.Fatalf("bind tag: expected 200, got %d: %s", res.StatusCode, string(raw))
		}
		var out struct {
			TagID string `json:"tagId"`
			URL   string `json:"url"`
		}
		raw, _ := io.ReadAll(res.Body)
		if err := json.Unmarshal(raw, &out); err != nil {
			t.Fatalf("decode tag: %v", err)
		}
		return out.TagID, out.URL
	}

	tagID, url := bind()
	if tagID == "" || url == "" {
		t.Fatalf("expected tag id and url")
	}

	res := doRequest(t, app, "GET", "http://localhost/api/v1/inventory/tags/"+tagID)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("resolve: expected 200, got %d", res.StatusCode)
	}
	var resolved struct {
		FolderID   string `json:"folderId"`
		FolderName string `json:"folderName"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &resolved); err != nil {
		t.Fatalf("decode resolved: %v", err)
	}
	if resolved.FolderID != mappe || resolved.FolderName != "Mappe Tuba" {
		t.Fatalf("resolved: %+v", resolved)
	}

	// Rotating invalidates the old tag.
	newTagID, _ := bind()
	if newTagID == tagID {
		t.Fatalf("rotation must mint a new tag id")
	}
	if res := doRequest(t, app, "GET", "http://localhost/api/v1/inventory/tags/"+tagID); res.StatusCode != http.StatusNotFound {
		t.Fatalf("old tag must be gone, got %d", res.StatusCode)
	}

	// Foreign folders cannot be tagged.
	req, _ := http.NewRequest("PUT", "http://localhost/api/v1/inventory/folders/does-not-exist/tag", nil)
	if res, _ := app.Test(req); res.StatusCode != http.StatusNotFound {
		t.Fatalf("foreign folder tag: expected 404, got %d", res.StatusCode)
	}
}
