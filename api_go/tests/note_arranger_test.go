package tests

import (
	"api_go/controllers/dto"
	"api_go/tests/builders"
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v3"
)

func createAuthorForTest(t *testing.T, app *fiber.App) dto.Author {
	t.Helper()
	encoded, _ := json.Marshal(builders.CreateAuthorDto())
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/authors", bytes.NewBuffer(encoded))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("create author failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 creating author, got %d", res.StatusCode)
	}
	var author dto.Author
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &author); err != nil {
		t.Fatalf("decode author: %v", err)
	}
	return author
}

func createFolderForNoteTest(t *testing.T, app *fiber.App) string {
	t.Helper()
	encoded, _ := json.Marshal(builders.CreateParentFolderPostDto())
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/elements/folders", bytes.NewBuffer(encoded))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("create folder failed: %v", err)
	}
	var folder dto.Folder
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &folder); err != nil {
		t.Fatalf("decode folder: %v", err)
	}
	return folder.Id
}

// noteResponse covers the fields shared by the create (models.Note) and update
// (dto.Note) payloads that this test asserts on.
type noteResponse struct {
	Id       string      `json:"id"`
	Name     string      `json:"name"`
	Author   *dto.Author `json:"author"`
	Arranger *dto.Author `json:"arranger"`
}

func TestNoteCreateAndUpdateWithArranger(t *testing.T) {
	app := SetupTest(t)
	folderId := createFolderForNoteTest(t, app)
	composer := createAuthorForTest(t, app)
	arranger := createAuthorForTest(t, app)
	otherArranger := createAuthorForTest(t, app)

	// Create note with composer + arranger.
	body, _ := json.Marshal(dto.NotePostDto{
		AuthorId:      composer.ID,
		ArrangerId:    arranger.ID,
		Description:   "desc",
		NumberOfPages: 3,
		ParentId:      folderId,
		Name:          "Arranged Piece",
	})
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/elements/notes", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("create note failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200 creating note, got %d: %s", res.StatusCode, string(raw))
	}
	var created noteResponse
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &created); err != nil {
		t.Fatalf("decode created note: %v", err)
	}
	if created.Arranger == nil || created.Arranger.ID != arranger.ID {
		t.Fatalf("expected arranger %s on created note, got %+v", arranger.ID, created.Arranger)
	}

	// The list read path returns the arranger too.
	listReq, _ := http.NewRequest("GET", "http://localhost/api/v1/elements/notes?page=0", nil)
	listRes, _ := app.Test(listReq)
	listRaw, _ := io.ReadAll(listRes.Body)
	var paged struct {
		Embedded struct {
			Notes []noteResponse `json:"noteRepresentationModelList"`
		} `json:"_embedded"`
	}
	if err := json.Unmarshal(listRaw, &paged); err != nil {
		t.Fatalf("decode note list: %v", err)
	}
	if len(paged.Embedded.Notes) != 1 || paged.Embedded.Notes[0].Arranger == nil ||
		paged.Embedded.Notes[0].Arranger.ID != arranger.ID {
		t.Fatalf("expected arranger in note list, got %+v", paged.Embedded.Notes)
	}

	patch := func(payload dto.NotePostDto) noteResponse {
		t.Helper()
		encoded, _ := json.Marshal(payload)
		req, _ := http.NewRequest("PATCH", "http://localhost/api/v1/elements/notes/"+created.Id, bytes.NewBuffer(encoded))
		req.Header.Set("Content-Type", "application/json")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("update note failed: %v", err)
		}
		if res.StatusCode != http.StatusOK {
			raw, _ := io.ReadAll(res.Body)
			t.Fatalf("expected 200 updating note, got %d: %s", res.StatusCode, string(raw))
		}
		var updated noteResponse
		raw, _ := io.ReadAll(res.Body)
		if err := json.Unmarshal(raw, &updated); err != nil {
			t.Fatalf("decode updated note: %v", err)
		}
		return updated
	}

	// Update: swap the arranger and the composer.
	updated := patch(dto.NotePostDto{
		AuthorId:      arranger.ID,
		ArrangerId:    otherArranger.ID,
		Description:   "desc2",
		NumberOfPages: 4,
		ParentId:      folderId,
		Name:          "Arranged Piece v2",
	})
	if updated.Arranger == nil || updated.Arranger.ID != otherArranger.ID {
		t.Fatalf("expected arranger swapped to %s, got %+v", otherArranger.ID, updated.Arranger)
	}
	if updated.Author == nil || updated.Author.ID != arranger.ID {
		t.Fatalf("expected composer swapped to %s, got %+v", arranger.ID, updated.Author)
	}

	// Update: clearing the arranger removes it.
	cleared := patch(dto.NotePostDto{
		AuthorId:      composer.ID,
		ArrangerId:    "",
		Description:   "desc3",
		NumberOfPages: 4,
		ParentId:      folderId,
		Name:          "Arranged Piece v3",
	})
	if cleared.Arranger != nil {
		t.Fatalf("expected arranger cleared, got %+v", cleared.Arranger)
	}

	// Unknown arranger id is rejected.
	badBody, _ := json.Marshal(dto.NotePostDto{
		AuthorId:      composer.ID,
		ArrangerId:    "does-not-exist",
		Description:   "desc",
		NumberOfPages: 4,
		ParentId:      folderId,
		Name:          "Arranged Piece v4",
	})
	badReq, _ := http.NewRequest("PATCH", "http://localhost/api/v1/elements/notes/"+created.Id, bytes.NewBuffer(badBody))
	badReq.Header.Set("Content-Type", "application/json")
	badRes, _ := app.Test(badReq)
	if badRes.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for unknown arranger, got %d", badRes.StatusCode)
	}
}
