package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

type clubSettingsResponse struct {
	ID                     string `json:"id"`
	MembersCanSendMessages bool   `json:"members_can_send_messages"`
	Name                   string `json:"name"`
}

func TestUpdateClubSettings(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)

	patch := `{"name":"Renamed Club","club_type":"musikverein","street":"Main","house_number":"1",` +
		`"location":"Town","postal_code":"12345","country":"DE","dates_visible_for_all_members":true,` +
		`"members_can_send_messages":false,"feedback_visibility":"leaders-and-authorized",` +
		`"reason_visibility":"leaders-and-authorized","confirmed_representative":true}`
	req, _ := http.NewRequest("PATCH", "http://localhost/api/v1/clubs/"+clubID, bytes.NewBufferString(patch))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("patch failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var updated clubSettingsResponse
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &updated); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if updated.Name != "Renamed Club" {
		t.Fatalf("expected renamed club, got %q", updated.Name)
	}
	if updated.MembersCanSendMessages != false {
		t.Fatalf("expected messaging disabled after patch, got %v", updated.MembersCanSendMessages)
	}

	memReq, _ := http.NewRequest("GET", "http://localhost/api/v1/clubs/"+clubID+"/members", nil)
	memRes, _ := app.Test(memReq)
	if memRes.StatusCode != http.StatusOK {
		t.Fatalf("members list expected 200, got %d", memRes.StatusCode)
	}
	var members []struct {
		UserID string `json:"userId"`
	}
	memRaw, _ := io.ReadAll(memRes.Body)
	if err := json.Unmarshal(memRaw, &members); err != nil {
		t.Fatalf("decode members: %v", err)
	}
	if len(members) != 1 {
		t.Fatalf("expected creator still a member after settings update, got %d", len(members))
	}
}

func TestUpdateClubSettingsEnablesMessaging(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)

	patch := `{"name":"Test Club","club_type":"musikverein","street":"Main","house_number":"1",` +
		`"location":"Town","postal_code":"12345","country":"DE","dates_visible_for_all_members":true,` +
		`"members_can_send_messages":true,"feedback_visibility":"all-members",` +
		`"reason_visibility":"all-members","confirmed_representative":true}`
	req, _ := http.NewRequest("PATCH", "http://localhost/api/v1/clubs/"+clubID, bytes.NewBufferString(patch))
	req.Header.Set("Content-Type", "application/json")
	res, _ := app.Test(req)
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var updated clubSettingsResponse
	raw, _ := io.ReadAll(res.Body)
	_ = json.Unmarshal(raw, &updated)
	if !updated.MembersCanSendMessages {
		t.Fatalf("expected messaging enabled after patch")
	}
}
