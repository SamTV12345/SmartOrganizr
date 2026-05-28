package tests

import (
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

func TestUnreadSummaryEmpty(t *testing.T) {
	app := SetupTest(t)

	req, _ := http.NewRequest("GET", "http://localhost/api/v1/notifications/unread-summary", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.StatusCode)
	}
	var summary struct {
		Total  int           `json:"total"`
		ByClub []interface{} `json:"byClub"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &summary); err != nil {
		t.Fatalf("decode summary: %v", err)
	}
	if summary.Total != 0 {
		t.Fatalf("expected total 0, got %d", summary.Total)
	}
}
