package tests

import (
	"net/http"
	"testing"
)

func TestIndex(t *testing.T) {
	app := SetupTest(t)
	req, _ := http.NewRequest("GET", "/api/public", nil)
	res, _ := app.Test(req)

	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", res.StatusCode)
	}
}
