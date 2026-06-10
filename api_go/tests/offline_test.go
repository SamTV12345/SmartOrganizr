package tests

import (
	"api_go/tests/builders"
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
)

func TestOfflineDataHasNoPdfContent(t *testing.T) {
	app := SetupTest(t)

	authorDto := builders.CreateAuthorDto()
	encoded, _ := json.Marshal(authorDto)
	createReq, _ := http.NewRequest("POST", "http://localhost/api/v1/authors", bytes.NewBuffer(encoded))
	createReq.Header.Set("Content-Type", "application/json")
	if _, err := app.Test(createReq); err != nil {
		t.Fatalf("failed to create author: %v", err)
	}

	req, _ := http.NewRequest("GET", "http://localhost/api/v1/users/offline", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to call offline endpoint: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.StatusCode)
	}

	body, _ := io.ReadAll(res.Body)
	if strings.Contains(string(body), "pdfContent") {
		t.Fatalf("offline payload must not contain pdfContent, got: %s", string(body))
	}

	var payload struct {
		Authors []map[string]any `json:"authors"`
		Folders []map[string]any `json:"folders"`
		Notes   []map[string]any `json:"notes"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("failed to decode offline payload: %v", err)
	}
	if len(payload.Authors) != 1 {
		t.Fatalf("expected 1 author in offline payload, got %d", len(payload.Authors))
	}
}
