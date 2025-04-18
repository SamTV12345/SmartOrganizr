package encodingHelper

import (
	"api_go/controllers/dto"
	"api_go/tests/builders"
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

func EncodeAuthorDto(t *testing.T) []byte {
	// Create a new Author DTO using the builders package
	var authorDto = builders.CreateAuthorDto()
	encoded, err := json.Marshal(authorDto)
	if err != nil {
		t.Fatalf("Failed to encode author DTO: %v", err)
	}
	return encoded
}

func EncodeAuthorPatchDtoWithModel(t *testing.T, authorDto dto.AuthorPatchDto) []byte {
	// Create a new Author DTO using the builders package
	encoded, err := json.Marshal(authorDto)
	if err != nil {
		t.Fatalf("Failed to encode author DTO: %v", err)
	}
	return encoded
}

func EncodeAuthorPatchDto(t *testing.T) []byte {
	// Create a new Author DTO using the builders package
	var authorDto = builders.CreateAuthorUpdateDto()
	encoded, err := json.Marshal(authorDto)
	if err != nil {
		t.Fatalf("Failed to encode author DTO: %v", err)
	}
	return encoded
}

func DecodeToAuthorDtoList(response *http.Response, t *testing.T) dto.PagedAuthorRepresentationModelList {
	var body []byte
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}

	var authorDtoList dto.PagedAuthorRepresentationModelList
	err = json.Unmarshal(body, &authorDtoList)
	if err != nil {
		t.Fatalf("Failed to decode JSON response: %v", err)
	}
	return authorDtoList
}

func DecodeAuthorDto(response *http.Response, t *testing.T) dto.Author {
	var body []byte
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}

	var authorDto dto.Author
	err = json.Unmarshal(body, &authorDto)
	if err != nil {
		t.Fatalf("Failed to decode JSON response: %v", err)
	}
	return authorDto
}
