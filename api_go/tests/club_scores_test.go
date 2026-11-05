package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v3"
)

type scorePart struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	SectionID   *string `json:"sectionId"`
	SectionName *string `json:"sectionName"`
	SizeBytes   int64   `json:"sizeBytes"`
}

type score struct {
	ID        string      `json:"id"`
	Title     string      `json:"title"`
	Composer  *string     `json:"composer"`
	PartCount int         `json:"partCount"`
	Parts     []scorePart `json:"parts"`
}

type scorePlaylistItem struct {
	Title        string  `json:"title"`
	Match        string  `json:"match"`
	PdfAvailable bool    `json:"pdfAvailable"`
	ScoreID      *string `json:"scoreId"`
	PartID       *string `json:"partId"`
	PartName     *string `json:"partName"`
	Parts        []struct {
		ID         string `json:"id"`
		Name       string `json:"name"`
		OwnSection bool   `json:"ownSection"`
	} `json:"parts"`
}

const testPartPDF = "%PDF-1.4 test part"

func decodeJSON[T any](t *testing.T, res *http.Response, wantStatus int) T {
	t.Helper()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != wantStatus {
		t.Fatalf("expected %d, got %d: %s", wantStatus, res.StatusCode, string(raw))
	}
	var out T
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("decode %s: %v", string(raw), err)
	}
	return out
}

func createScore(t *testing.T, app *fiber.App, clubID, title string) score {
	t.Helper()
	res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/scores", map[string]any{"title": title, "composer": "Kees Vlak"})
	return decodeJSON[score](t, res, http.StatusOK)
}

func uploadPart(t *testing.T, app *fiber.App, clubID, scoreID, name, sectionID string, content []byte) *http.Response {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, _ := w.CreateFormFile("file", name+".pdf")
	_, _ = fw.Write(content)
	_ = w.WriteField("name", name)
	if sectionID != "" {
		_ = w.WriteField("sectionId", sectionID)
	}
	w.Close()
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/"+clubID+"/scores/"+scoreID+"/parts", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("upload part: %v", err)
	}
	return res
}

func TestClubScoreArchiveCrud(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	clarinets := createSection(t, app, clubID, "Klarinetten")

	s := createScore(t, app, clubID, "Abel Tasman")
	if s.Title != "Abel Tasman" || s.Composer == nil || *s.Composer != "Kees Vlak" || s.PartCount != 0 {
		t.Fatalf("unexpected score %+v", s)
	}

	withPart := decodeJSON[score](t, uploadPart(t, app, clubID, s.ID, "1. Klarinette", clarinets, []byte(testPartPDF)), http.StatusOK)
	if len(withPart.Parts) != 1 || withPart.Parts[0].SectionName == nil || *withPart.Parts[0].SectionName != "Klarinetten" || withPart.Parts[0].SizeBytes != int64(len(testPartPDF)) {
		t.Fatalf("unexpected parts %+v", withPart.Parts)
	}
	partID := withPart.Parts[0].ID

	// Not a PDF, and a section of another club, are rejected.
	if res := uploadPart(t, app, clubID, s.ID, "Text", "", []byte("hello")); res.StatusCode != http.StatusBadRequest {
		t.Fatalf("non-PDF upload: expected 400, got %d", res.StatusCode)
	}
	otherClub := createClubForTest(t, app)
	foreignSection := createSection(t, app, otherClub, "Fremd")
	if res := uploadPart(t, app, clubID, s.ID, "Fremd", foreignSection, []byte(testPartPDF)); res.StatusCode != http.StatusBadRequest {
		t.Fatalf("foreign section: expected 400, got %d", res.StatusCode)
	}

	// Download returns the PDF bytes.
	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/scores/"+s.ID+"/parts/"+partID+"/pdf")
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK || string(raw) != testPartPDF {
		t.Fatalf("download: %d %q", res.StatusCode, string(raw))
	}

	// Rename + unassign section.
	req, _ := http.NewRequest("PATCH", "http://localhost/api/v1/clubs/"+clubID+"/scores/"+s.ID+"/parts/"+partID, bytes.NewBufferString(`{"name":"Klarinette 1 in B","sectionId":null}`))
	req.Header.Set("Content-Type", "application/json")
	patched, _ := app.Test(req)
	updated := decodeJSON[score](t, patched, http.StatusOK)
	if updated.Parts[0].Name != "Klarinette 1 in B" || updated.Parts[0].SectionID != nil {
		t.Fatalf("unexpected patched part %+v", updated.Parts[0])
	}

	// List shows the part count; delete removes the score.
	list := decodeJSON[[]score](t, doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/scores"), http.StatusOK)
	if len(list) != 1 || list[0].PartCount != 1 {
		t.Fatalf("unexpected list %+v", list)
	}
	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/scores/"+s.ID); res.StatusCode != http.StatusNoContent {
		t.Fatalf("delete: expected 204, got %d", res.StatusCode)
	}
	if res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/scores/"+s.ID); res.StatusCode != http.StatusNotFound {
		t.Fatalf("get deleted: expected 404, got %d", res.StatusCode)
	}
}

func TestClubScoreMemberCanReadButNotEdit(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	s := createScore(t, app, clubID, "Florentiner Marsch")
	withPart := decodeJSON[score](t, uploadPart(t, app, clubID, s.ID, "Tuba", "", []byte(testPartPDF)), http.StatusOK)

	demoteTestUserToMember(t, app, clubID, "score-boss")

	if res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/scores", map[string]any{"title": "Hijack"}); res.StatusCode != http.StatusForbidden {
		t.Fatalf("member create: expected 403, got %d", res.StatusCode)
	}
	if res := uploadPart(t, app, clubID, s.ID, "Hijack", "", []byte(testPartPDF)); res.StatusCode != http.StatusForbidden {
		t.Fatalf("member upload: expected 403, got %d", res.StatusCode)
	}
	if res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/scores/"+s.ID+"/parts/"+withPart.Parts[0].ID+"/pdf"); res.StatusCode != http.StatusOK {
		t.Fatalf("member download: expected 200, got %d", res.StatusCode)
	}
}

func TestEventPlaylistGivesEachMemberTheirPart(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	clarinets := createSection(t, app, clubID, "Klarinetten")
	tubas := createSection(t, app, clubID, "Tuben")
	eventID := createEvent(t, app, clubID, "Probe")

	s := createScore(t, app, clubID, "Abel Tasman")
	uploadPart(t, app, clubID, s.ID, "Direktion", "", []byte(testPartPDF))
	uploadPart(t, app, clubID, s.ID, "1. Klarinette", clarinets, []byte(testPartPDF))
	full := decodeJSON[score](t, uploadPart(t, app, clubID, s.ID, "2. Klarinette", clarinets, []byte(testPartPDF)), http.StatusOK)
	uploadPart(t, app, clubID, s.ID, "Tuba", tubas, []byte(testPartPDF))
	second := full.Parts[2].ID

	body := `{"entries":[{"title":"Abel Tasman","scoreId":"` + s.ID + `"},{"title":"Ansage"}]}`
	if res := putProgram(t, app, clubID, eventID, body); res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("put program: %d %s", res.StatusCode, string(raw))
	}
	program := getProgram(t, app, clubID, eventID)
	if program[0].Title != "Abel Tasman" {
		t.Fatalf("unexpected program %+v", program)
	}

	playlistURL := "http://localhost/api/v1/clubs/" + clubID + "/events/" + eventID + "/program/playlist"

	// Without a section: nothing assigned automatically, all parts offered.
	items := decodeJSON[[]scorePlaylistItem](t, doRequest(t, app, "GET", playlistURL), http.StatusOK)
	if items[0].Match != "choosePart" || items[0].PartID != nil || len(items[0].Parts) != 4 || items[0].PdfAvailable {
		t.Fatalf("member without section: %+v", items[0])
	}
	if items[1].ScoreID != nil || items[1].Match != "none" {
		t.Fatalf("free-text entry: %+v", items[1])
	}

	// In the clarinet section: first clarinet part, own parts listed first.
	assignSection(t, app, clubID, "12345", &clarinets, false, http.StatusNoContent)
	items = decodeJSON[[]scorePlaylistItem](t, doRequest(t, app, "GET", playlistURL), http.StatusOK)
	if items[0].Match != "part" || items[0].PartName == nil || *items[0].PartName != "1. Klarinette" || !items[0].PdfAvailable {
		t.Fatalf("clarinettist: %+v", items[0])
	}
	if !items[0].Parts[0].OwnSection || !items[0].Parts[1].OwnSection || items[0].Parts[2].OwnSection {
		t.Fatalf("own section parts first: %+v", items[0].Parts)
	}

	// Switching to the second part is remembered.
	req, _ := http.NewRequest("PUT", "http://localhost/api/v1/clubs/"+clubID+"/scores/"+s.ID+"/choice", bytes.NewBufferString(`{"partId":"`+second+`"}`))
	req.Header.Set("Content-Type", "application/json")
	if res, _ := app.Test(req); res.StatusCode != http.StatusNoContent {
		t.Fatalf("choose part: expected 204, got %d", res.StatusCode)
	}
	items = decodeJSON[[]scorePlaylistItem](t, doRequest(t, app, "GET", playlistURL), http.StatusOK)
	if items[0].PartID == nil || *items[0].PartID != second {
		t.Fatalf("remembered choice: %+v", items[0])
	}

	// A score of another club cannot be linked.
	foreign := createScore(t, app, createClubForTest(t, app), "Fremd")
	if res := putProgram(t, app, clubID, eventID, `{"entries":[{"title":"X","scoreId":"`+foreign.ID+`"}]}`); res.StatusCode == http.StatusOK {
		t.Fatalf("foreign score must be rejected")
	}
}
