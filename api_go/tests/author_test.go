package tests

import (
	"api_go/controllers/dto"
	"api_go/tests/builders"
	"api_go/tests/encodingHelper"
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

func TestGetAuthors0Users(t *testing.T) {
	app := SetupTest(t)
	request, _ := http.NewRequest("GET", "/api/v1/authors?page=0", nil)
	res, err := app.Test(request)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", res.StatusCode)
	}

	var decodedAuthors = encodingHelper.DecodeToAuthorDtoList(res, t)
	if len(decodedAuthors.Embedded.AuthorRepresentationModelList) != 0 {
		t.Fatalf("expected 0 authors, got %d", len(decodedAuthors.Embedded.AuthorRepresentationModelList))
	}
}

func TestAddAuthorAndRetrieveFirst(t *testing.T) {
	app := SetupTest(t)

	var authorDto = builders.CreateAuthorDto()
	encoded, err := json.Marshal(authorDto)
	if err != nil {
		t.Fatalf("failed to encode authorDto: %v", err)
	}
	// Add an author
	requestToCreateAuthor, _ := http.NewRequest("POST", "/api/v1/authors", bytes.NewBuffer(encoded))
	requestToCreateAuthor.Header.Set("Content-Type", "application/json")

	response, err := app.Test(requestToCreateAuthor)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", response.StatusCode)
	}

	request, _ := http.NewRequest("GET", "/api/v1/authors?page=0", nil)
	res, err := app.Test(request)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", res.StatusCode)
	}

	var decodedAuthorList = encodingHelper.DecodeToAuthorDtoList(res, t)

	if len(decodedAuthorList.Embedded.AuthorRepresentationModelList) != 1 {
		t.Fatalf("expected 1 author, got %d", len(decodedAuthorList.Embedded.AuthorRepresentationModelList))
	}

}

func TestUpdateAuthorAndRetrieveFirst(t *testing.T) {
	app := SetupTest(t)

	var authorDto = builders.CreateAuthorDto()
	encoded, err := json.Marshal(authorDto)
	if err != nil {
		t.Fatalf("failed to encode authorDto: %v", err)
	}
	// Add an author
	requestToCreateAuthor, _ := http.NewRequest("POST", "/api/v1/authors", bytes.NewBuffer(encoded))
	requestToCreateAuthor.Header.Set("Content-Type", "application/json")

	response, err := app.Test(requestToCreateAuthor)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", response.StatusCode)
	}

	var createdAuthor = encodingHelper.DecodeAuthorDto(response, t)

	var patchDtoToUpdate = builders.CreateAuthorUpdateDto()
	var updatedAuthorDto = encodingHelper.EncodeAuthorPatchDtoWithModel(t, patchDtoToUpdate)

	requestToUpdateAuthor, _ := http.NewRequest("PATCH", "/api/v1/authors/"+createdAuthor.ID, bytes.NewBuffer(updatedAuthorDto))
	requestToUpdateAuthor.Header.Set("Content-Type", "application/json")

	response, err = app.Test(requestToUpdateAuthor)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", response.StatusCode)
	}
	updatedAuthor := encodingHelper.DecodeAuthorDto(response, t)
	if updatedAuthor.Name != patchDtoToUpdate.Name {
		t.Fatalf("expected author name to be %s, got %s", authorDto.Name, updatedAuthor.Name)
	}
	if updatedAuthor.ExtraInformation != patchDtoToUpdate.ExtraInformation {
		t.Fatalf("expected author extra information to be %s, got %s", authorDto.ExtraInformation, updatedAuthor.ExtraInformation)
	}
	request, _ := http.NewRequest("GET", "/api/v1/authors?page=0", nil)
	response, err = app.Test(request)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", response.StatusCode)
	}

	var decodedAuthors = encodingHelper.DecodeToAuthorDtoList(response, t)
	if len(decodedAuthors.Embedded.AuthorRepresentationModelList) != 1 {
		t.Fatalf("expected 1 author, got %d", len(decodedAuthors.Embedded.AuthorRepresentationModelList))
	}
}

func TestAddAuthorAndRetrieveSpecificAuthor(t *testing.T) {
	app := SetupTest(t)
	encoded := encodingHelper.EncodeAuthorDto(t)

	requestToCreateAuthor, _ := http.NewRequest("POST", "/api/v1/authors", bytes.NewBuffer(encoded))

	// Add an author
	requestToCreateAuthor.Header.Set("Content-Type", "application/json")

	response, err := app.Test(requestToCreateAuthor)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", response.StatusCode)
	}

	var createdAuthor dto.Author
	bytes, err := io.ReadAll(response.Body)

	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	json.Unmarshal(bytes, &createdAuthor)

	request, _ := http.NewRequest("DELETE", "/api/v1/authors/"+createdAuthor.ID, nil)
	request.Header.Set("Content-Type", "application/json")

	response, err = app.Test(request)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	if response.StatusCode != http.StatusNoContent {
		t.Fatalf("expected status code 200, got %d", response.StatusCode)
	}
}
