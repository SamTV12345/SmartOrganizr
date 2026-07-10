package tests

import (
	"api_go/controllers/dto"
	"api_go/tests/builders"
	"api_go/tests/encodingHelper"
	"bytes"
	"encoding/json"
	"github.com/go-faker/faker/v4"
	"github.com/gofiber/fiber/v3"
	"io"
	"net/http"
	"testing"
)

func TestCreateParentFolder(t *testing.T) {
	app := SetupTest(t)
	folderPost := builders.CreateParentFolderPostDto()
	bytesEncoded, _ := json.Marshal(folderPost)
	request, _ := http.NewRequest("POST", "http://localhost/api/v1/elements/folders", bytes.NewBuffer(bytesEncoded))
	request.Header.Set("Content-Type", "application/json")
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", response.StatusCode)
	}
	readBytes, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}
	var folderDto dto.Folder
	encodingHelper.Decode(readBytes, &folderDto)
	if folderDto.Name != folderPost.Name {
		t.Fatalf("expected folder name %s, got %s", folderPost.Name, folderDto.Name)
	}
	if folderDto.Description != folderPost.Description {
		t.Fatalf("expected folder description %s, got %s", folderPost.Description, folderDto.Description)
	}

	if folderDto.Id == "" {
		t.Fatalf("expected folder ID to be set, got empty string")
	}

	if folderDto.Parent != nil {
		t.Fatalf("expected folder parent to be nil, got %v", folderDto.Parent)
	}
}

func TestCreateSubFolderWithNoParent(t *testing.T) {
	app := SetupTest(t)
	parentUUID := faker.UUIDHyphenated()
	subfolder := builders.CreateSubFolderPostDto(parentUUID)
	bytesEncoded, _ := json.Marshal(subfolder)
	request, _ := http.NewRequest("POST", "http://localhost/api/v1/elements/folders", bytes.NewBuffer(bytesEncoded))
	request.Header.Set("Content-Type", "application/json")
	response, _ := app.Test(request)
	if response.StatusCode != http.StatusConflict {
		t.Fatalf("expected error, got nil %d", response.StatusCode)
	}
}

func TestCreateSubFolder(t *testing.T) {
	app := SetupTest(t)
	folderPost := builders.CreateParentFolderPostDto()
	bytesEncoded, _ := json.Marshal(folderPost)
	request, _ := http.NewRequest("POST", "http://localhost/api/v1/elements/folders", bytes.NewBuffer(bytesEncoded))
	request.Header.Set("Content-Type", "application/json")
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", response.StatusCode)
	}
	readBytes, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}
	var folderDto dto.Folder
	encodingHelper.Decode(readBytes, &folderDto)
	subfolder := builders.CreateSubFolderPostDto(folderDto.Id)
	bytesEncoded, _ = json.Marshal(subfolder)
	request, _ = http.NewRequest("POST", "http://localhost/api/v1/elements/folders", bytes.NewBuffer(bytesEncoded))
	request.Header.Set("Content-Type", "application/json")
	response, err = app.Test(request)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", response.StatusCode)
	}
	readBytes, err = io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	var subfolderDto dto.Folder
	encodingHelper.Decode(readBytes, &subfolderDto)
	if subfolderDto.Name != subfolder.Name {
		t.Fatalf("expected folder name %s, got %s", subfolder.Name, subfolderDto.Name)
	}
	if subfolderDto.Description != subfolder.Description {
		t.Fatalf("expected folder description %s, got %s", subfolder.Description, subfolderDto.Description)
	}
	if subfolderDto.Id == "" {
		t.Fatalf("expected folder ID to be set, got empty string")
	}

	if subfolderDto.Parent == nil {
		t.Fatalf("expected folder parent to be set, got nil")
	}
}

// TestFindNextChildrenWithComposerlessChild guards against the regression where
// listing a folder's children failed with "converting NULL to string is
// unsupported": the children query LEFT JOINed authors and embedded a
// non-nullable author id, so any child without a composer (e.g. a subfolder)
// crashed the scan. A subfolder has no composer, so this reproduces it.
func TestFindNextChildrenWithComposerlessChild(t *testing.T) {
	app := SetupTest(t)

	// Create a parent folder.
	folderPost := builders.CreateParentFolderPostDto()
	bytesEncoded, _ := json.Marshal(folderPost)
	request, _ := http.NewRequest("POST", "http://localhost/api/v1/elements/folders", bytes.NewBuffer(bytesEncoded))
	request.Header.Set("Content-Type", "application/json")
	response, _ := app.Test(request)
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 creating parent folder, got %d", response.StatusCode)
	}
	readBytes, _ := io.ReadAll(response.Body)
	var parent dto.Folder
	encodingHelper.Decode(readBytes, &parent)

	// Create a composer-less subfolder under it.
	subfolder := builders.CreateSubFolderPostDto(parent.Id)
	bytesEncoded, _ = json.Marshal(subfolder)
	request, _ = http.NewRequest("POST", "http://localhost/api/v1/elements/folders", bytes.NewBuffer(bytesEncoded))
	request.Header.Set("Content-Type", "application/json")
	if _, err := app.Test(request); err != nil {
		t.Fatalf("failed to create subfolder: %v", err)
	}

	// Listing children must succeed (previously failed on the NULL author scan).
	childReq, _ := http.NewRequest("GET", "http://localhost/api/v1/elements/"+parent.Id+"/children", nil)
	childRes, err := app.Test(childReq)
	if err != nil {
		t.Fatalf("children request failed: %v", err)
	}
	if childRes.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(childRes.Body)
		t.Fatalf("expected 200 listing children, got %d: %s", childRes.StatusCode, string(raw))
	}
	var children []map[string]any
	raw, _ := io.ReadAll(childRes.Body)
	if err := json.Unmarshal(raw, &children); err != nil {
		t.Fatalf("decode children: %v", err)
	}
	if len(children) != 1 {
		t.Fatalf("expected 1 child folder, got %d", len(children))
	}
}

// createNoteFixture creates a parent folder, an author and a note inside the
// folder via the API and returns the folder and note ids.
func createNoteFixture(t *testing.T, app *fiber.App) (folderId string, noteId string) {
	folderPost := builders.CreateParentFolderPostDto()
	bytesEncoded, _ := json.Marshal(folderPost)
	request, _ := http.NewRequest("POST", "http://localhost/api/v1/elements/folders", bytes.NewBuffer(bytesEncoded))
	request.Header.Set("Content-Type", "application/json")
	response, _ := app.Test(request)
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 creating parent folder, got %d", response.StatusCode)
	}
	readBytes, _ := io.ReadAll(response.Body)
	var folder dto.Folder
	encodingHelper.Decode(readBytes, &folder)

	authorEncoded := encodingHelper.EncodeAuthorDto(t)
	request, _ = http.NewRequest("POST", "http://localhost/api/v1/authors", bytes.NewBuffer(authorEncoded))
	request.Header.Set("Content-Type", "application/json")
	response, _ = app.Test(request)
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 creating author, got %d", response.StatusCode)
	}
	author := encodingHelper.DecodeAuthorDto(response, t)

	notePost := dto.NotePostDto{
		AuthorId:      author.ID,
		Description:   faker.Word(),
		NumberOfPages: 3,
		ParentId:      folder.Id,
		Name:          faker.Word(),
	}
	bytesEncoded, _ = json.Marshal(notePost)
	request, _ = http.NewRequest("POST", "http://localhost/api/v1/elements/notes", bytes.NewBuffer(bytesEncoded))
	request.Header.Set("Content-Type", "application/json")
	response, _ = app.Test(request)
	if response.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(response.Body)
		t.Fatalf("expected 200 creating note, got %d: %s", response.StatusCode, string(raw))
	}
	readBytes, _ = io.ReadAll(response.Body)
	var note struct {
		Id string `json:"id"`
	}
	encodingHelper.Decode(readBytes, &note)
	if note.Id == "" {
		t.Fatalf("expected note ID to be set, got empty string")
	}
	return folder.Id, note.Id
}

// countChildren lists the children of a folder and returns how many there are.
func countChildren(t *testing.T, app *fiber.App, folderId string) int {
	request, _ := http.NewRequest("GET", "http://localhost/api/v1/elements/"+folderId+"/children", nil)
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("children request failed: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 listing children, got %d", response.StatusCode)
	}
	raw, _ := io.ReadAll(response.Body)
	var children []map[string]any
	if err := json.Unmarshal(raw, &children); err != nil {
		t.Fatalf("decode children: %v", err)
	}
	return len(children)
}

func TestGetParentOfNote(t *testing.T) {
	app := SetupTest(t)
	folderId, noteId := createNoteFixture(t, app)

	request, _ := http.NewRequest("GET", "http://localhost/api/v1/elements/"+noteId+"/parent", nil)
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	raw, _ := io.ReadAll(response.Body)
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d: %s", response.StatusCode, string(raw))
	}
	if string(raw) != folderId {
		t.Fatalf("expected parent folder id %s, got %s", folderId, string(raw))
	}
}

func TestDeleteElementNote(t *testing.T) {
	app := SetupTest(t)
	folderId, noteId := createNoteFixture(t, app)

	request, _ := http.NewRequest("DELETE", "http://localhost/api/v1/elements/"+noteId, nil)
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	if response.StatusCode != http.StatusNoContent {
		raw, _ := io.ReadAll(response.Body)
		t.Fatalf("expected status code 204, got %d: %s", response.StatusCode, string(raw))
	}

	// The note must be gone, but its parent folder must survive.
	if got := countChildren(t, app, folderId); got != 0 {
		t.Fatalf("expected 0 children after deleting note, got %d", got)
	}
}

func TestDeleteElementFolder(t *testing.T) {
	app := SetupTest(t)

	// A non-empty folder: the contained note must be deleted with it via the
	// cascading parent FK (the blocking legacy constraint was dropped in
	// migration 00026).
	folderId, _ := createNoteFixture(t, app)

	request, _ := http.NewRequest("DELETE", "http://localhost/api/v1/elements/"+folderId, nil)
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	if response.StatusCode != http.StatusNoContent {
		raw, _ := io.ReadAll(response.Body)
		t.Fatalf("expected status code 204, got %d: %s", response.StatusCode, string(raw))
	}

	// The folder must no longer show up as a parent deck.
	request, _ = http.NewRequest("GET", "http://localhost/api/v1/elements/parentDecks", nil)
	response, err = app.Test(request)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", response.StatusCode)
	}
	raw, _ := io.ReadAll(response.Body)
	var decks []map[string]any
	if err := json.Unmarshal(raw, &decks); err != nil {
		t.Fatalf("decode parent decks: %v", err)
	}
	if len(decks) != 0 {
		t.Fatalf("expected 0 parent decks after deleting folder, got %d", len(decks))
	}
}
