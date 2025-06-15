package tests

import (
	"api_go/tests/encodingHelper"
	"net/http"
	"testing"
)

func TestGetClubs0Clubs(t *testing.T) {
	app := SetupTest(t)
	request, _ := http.NewRequest("GET", "/api/v1/clubs/123", nil)
	res, err := app.Test(request)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", res.StatusCode)
	}
	clubsList := encodingHelper.DecodeClubs(res, t)
	if len(clubsList) != 0 {
		t.Fatalf("got none empty clubs list")
	}
}

func TestGetclubs1Clubs(t *testing.T) {
	app := SetupTest(t)
	request, _ := http.NewRequest("GET", "/api/v1/clubs/123", nil)
	res, err := app.Test(request)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", res.StatusCode)
	}
	clubsList := encodingHelper.DecodeClubs(res, t)
	// TODO add club to db
	if len(clubsList) != 0 {
		t.Fatalf("got %d clubs list", len(clubsList))
	}
}
