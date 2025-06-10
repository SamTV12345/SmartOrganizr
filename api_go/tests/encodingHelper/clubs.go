package encodingHelper

import (
	"api_go/controllers/dto"
	"io"
	"net/http"
	"testing"
)

func DecodeClubs(response *http.Response, t *testing.T) []dto.ClubDto {
	var body []byte
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}
	var dtoClubs []dto.ClubDto
	Decode[[]dto.ClubDto](body, &dtoClubs)
	return dtoClubs
}
