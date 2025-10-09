package tests

import (
	"net/http"
	"testing"
)

func TestGetHealth(t *testing.T) {
	app := SetupTest(t)
	request, _ := http.NewRequest("GET", "/health", nil)
	res, err := app.Test(request)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", res.StatusCode)
	}
}
