package tests

import (
	db2 "api_go/db"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
)

// seedClubMember creates a foreign user directly in the DB and adds it to the club.
// The API cannot do this because the auth stub pins the requester to user "12345".
func seedClubMember(t *testing.T, clubID, userID, role string) {
	t.Helper()
	ctx := context.Background()
	if _, err := testQueries.CreateUser(ctx, db2.CreateUserParams{
		ID:               userID,
		Username:         db2.NewSQLNullString(userID),
		SideBarCollapsed: false,
		Firstname:        db2.NewSQLNullString("Fremd"),
		Lastname:         db2.NewSQLNullString("Nutzer"),
	}); err != nil {
		t.Fatalf("seed user %s: %v", userID, err)
	}
	if err := testQueries.CreateMemberInClub(ctx, db2.CreateMemberInClubParams{
		UserID: userID,
		ClubID: clubID,
		Role:   db2.ClubParticipantRole(role),
	}); err != nil {
		t.Fatalf("seed membership %s: %v", userID, err)
	}
}

func patchRole(t *testing.T, app *fiber.App, clubID, userID, role string, wantStatus int) {
	t.Helper()
	body := `{"role":"` + role + `"}`
	req, _ := http.NewRequest("PATCH", "http://localhost/api/v1/clubs/"+clubID+"/members/"+userID+"/role", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("patch role: %v", err)
	}
	if res.StatusCode != wantStatus {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("patch role: expected %d, got %d: %s", wantStatus, res.StatusCode, string(raw))
	}
}

func doRequest(t *testing.T, app *fiber.App, method, url string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest(method, url, nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, url, err)
	}
	return res
}

func memberCount(t *testing.T, app *fiber.App, clubID string) int {
	t.Helper()
	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/members")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("list members: expected 200, got %d", res.StatusCode)
	}
	var members []struct {
		UserID string `json:"user_id"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &members); err != nil {
		t.Fatalf("decode members: %v", err)
	}
	return len(members)
}

func TestRemoveMemberAsLeiter(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	seedClubMember(t, clubID, "member-2", "MITGLIED")

	if got := memberCount(t, app, clubID); got != 2 {
		t.Fatalf("expected 2 members before removal, got %d", got)
	}
	res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/members/member-2")
	if res.StatusCode != http.StatusNoContent {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 204 removing member, got %d: %s", res.StatusCode, string(raw))
	}
	if got := memberCount(t, app, clubID); got != 1 {
		t.Fatalf("expected 1 member after removal, got %d", got)
	}
}

func TestRemoveLastLeiterConflict(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	seedClubMember(t, clubID, "leiter-2", "MITGLIED")
	// Make leiter-2 the only LEITER: promote them, then demote the test user.
	patchRole(t, app, clubID, "leiter-2", "LEITER", http.StatusNoContent)
	patchRole(t, app, clubID, "12345", "CO_LEITER", http.StatusNoContent)

	res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/members/leiter-2")
	if res.StatusCode != http.StatusConflict {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 409 removing last LEITER, got %d: %s", res.StatusCode, string(raw))
	}
}

func TestRemoveSelfRejected(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)

	res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/members/12345")
	if res.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 removing yourself, got %d", res.StatusCode)
	}
}

func TestLastLeiterCannotLeave(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)

	res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/members/me")
	if res.StatusCode != http.StatusConflict {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 409 for last LEITER leaving, got %d: %s", res.StatusCode, string(raw))
	}
}

func TestLeaveClubAfterRoleTransfer(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	seedClubMember(t, clubID, "leiter-2", "MITGLIED")
	patchRole(t, app, clubID, "leiter-2", "LEITER", http.StatusNoContent)

	res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/members/me")
	if res.StatusCode != http.StatusNoContent {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 204 leaving club, got %d: %s", res.StatusCode, string(raw))
	}
	// No longer a member -> members list is forbidden.
	if res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/members"); res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 after leaving, got %d", res.StatusCode)
	}
}

func TestPendingInvitationsListAndRevoke(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	ctx := context.Background()

	seedInvitation := func(token, email string, expiresAt time.Time) {
		if err := testQueries.CreateClubInvitation(ctx, db2.CreateClubInvitationParams{
			Token:           token,
			ClubID:          clubID,
			InvitedEmail:    email,
			InvitedByUserID: "12345",
			ExpiresAt:       expiresAt,
		}); err != nil {
			t.Fatalf("seed invitation: %v", err)
		}
	}
	seedInvitation("inv-pending", "pending@example.com", time.Now().Add(14*24*time.Hour))
	seedInvitation("inv-expired", "expired@example.com", time.Now().Add(-time.Hour))

	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/invitations")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 listing invitations, got %d", res.StatusCode)
	}
	var invitations []struct {
		Token        string `json:"token"`
		InvitedEmail string `json:"invited_email"`
		CreatedAt    string `json:"created_at"`
		ExpiresAt    string `json:"expires_at"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &invitations); err != nil {
		t.Fatalf("decode invitations: %v", err)
	}
	if len(invitations) != 1 || invitations[0].Token != "inv-pending" || invitations[0].InvitedEmail != "pending@example.com" {
		t.Fatalf("expected only the pending invitation, got %+v", invitations)
	}
	if invitations[0].ExpiresAt == "" || invitations[0].CreatedAt == "" {
		t.Fatalf("expected timestamps on invitation, got %+v", invitations[0])
	}

	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/invitations/inv-pending"); res.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204 revoking invitation, got %d", res.StatusCode)
	}
	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/invitations/inv-pending"); res.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 revoking twice, got %d", res.StatusCode)
	}

	res = doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/invitations")
	raw, _ = io.ReadAll(res.Body)
	var remaining []struct{}
	_ = json.Unmarshal(raw, &remaining)
	if len(remaining) != 0 {
		t.Fatalf("expected no pending invitations after revoke, got %d", len(remaining))
	}
}

func TestDeleteClubCascades(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	ctx := context.Background()

	seedClubMember(t, clubID, "member-2", "MITGLIED")
	eventID := createEvent(t, app, clubID, "ToBeDeleted")
	if err := testQueries.CreateClubInvitation(ctx, db2.CreateClubInvitationParams{
		Token:           "inv-cascade",
		ClubID:          clubID,
		InvitedEmail:    "cascade@example.com",
		InvitedByUserID: "12345",
		ExpiresAt:       time.Now().Add(24 * time.Hour),
	}); err != nil {
		t.Fatalf("seed invitation: %v", err)
	}

	res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID)
	if res.StatusCode != http.StatusNoContent {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 204 deleting club, got %d: %s", res.StatusCode, string(raw))
	}

	if _, err := testQueries.FindClubByID(ctx, clubID); err == nil {
		t.Fatalf("expected club to be gone")
	}
	if members, err := testQueries.FindAllMembersOfClub(ctx, clubID); err != nil || len(members) != 0 {
		t.Fatalf("expected participants to be gone, got %d (err %v)", len(members), err)
	}
	if _, err := testQueries.FindClubInvitationByToken(ctx, "inv-cascade"); err == nil {
		t.Fatalf("expected invitation to be gone")
	}
	if _, err := testQueries.GetClubEventByID(ctx, db2.GetClubEventByIDParams{ID: eventID, ClubID: clubID}); err == nil {
		t.Fatalf("expected club event to cascade away")
	}
}

func TestNonManagerGets403(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	seedClubMember(t, clubID, "leiter-2", "MITGLIED")
	// Demote the test user to plain member (leiter-2 takes over).
	patchRole(t, app, clubID, "leiter-2", "LEITER", http.StatusNoContent)
	patchRole(t, app, clubID, "12345", "MITGLIED", http.StatusNoContent)

	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/members/leiter-2"); res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 removing member as MITGLIED, got %d", res.StatusCode)
	}
	if res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/invitations"); res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 listing invitations as MITGLIED, got %d", res.StatusCode)
	}
	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/invitations/whatever"); res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 revoking invitation as MITGLIED, got %d", res.StatusCode)
	}
	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID); res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 deleting club as MITGLIED, got %d", res.StatusCode)
	}
}
