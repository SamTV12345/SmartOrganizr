package tests

import (
	"net/http"
	"testing"
)

func TestGetUser(t *testing.T) {
	app := SetupTest(t)
	req, _ := http.NewRequest("GET", "/api/v1/users/token", nil)
	userFromAPI, _ := app.Test(req)

	if userFromAPI.StatusCode != http.StatusOK {
		t.Fatalf("expected status code 200, got %d", userFromAPI.StatusCode)
	}
}
