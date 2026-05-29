package tests

import (
	"api_go/controllers/dto"
	"api_go/tests/builders"
	"api_go/tests/encodingHelper"
	"bytes"
	"encoding/json"
	"github.com/go-faker/faker/v4"
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
