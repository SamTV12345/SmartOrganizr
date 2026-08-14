package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v3"
)

type pollOption struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	VoteCount int    `json:"voteCount"`
	VotedByMe bool   `json:"votedByMe"`
}

type poll struct {
	ID             string       `json:"id"`
	Question       string       `json:"question"`
	MultipleChoice bool         `json:"multipleChoice"`
	Closed         bool         `json:"closed"`
	TotalVotes     int          `json:"totalVotes"`
	Options        []pollOption `json:"options"`
}

func createPoll(t *testing.T, app *fiber.App, clubID, question string, multiple bool, opts ...string) poll {
	t.Helper()
	payload := map[string]any{"question": question, "multipleChoice": multiple, "options": opts}
	raw, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/"+clubID+"/polls", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("create poll failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200 creating poll, got %d: %s", res.StatusCode, string(body))
	}
	var p poll
	body, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(body, &p); err != nil {
		t.Fatalf("decode poll: %v", err)
	}
	if p.ID == "" || len(p.Options) != len(opts) {
		t.Fatalf("unexpected poll: %+v", p)
	}
	return p
}

func listPolls(t *testing.T, app *fiber.App, clubID string) []poll {
	t.Helper()
	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/polls")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("list polls expected 200, got %d", res.StatusCode)
	}
	var polls []poll
	body, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(body, &polls); err != nil {
		t.Fatalf("decode polls: %v", err)
	}
	return polls
}

func votePoll(t *testing.T, app *fiber.App, clubID, pollID string, wantStatus int, optionIDs ...string) {
	t.Helper()
	raw, _ := json.Marshal(map[string]any{"optionIds": optionIDs})
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/"+clubID+"/polls/"+pollID+"/vote", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("vote failed: %v", err)
	}
	if res.StatusCode != wantStatus {
		body, _ := io.ReadAll(res.Body)
		t.Fatalf("vote expected %d, got %d: %s", wantStatus, res.StatusCode, string(body))
	}
}

func TestCreateAndListPoll(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	createPoll(t, app, clubID, "Summer date?", false, "June", "July")

	polls := listPolls(t, app, clubID)
	if len(polls) != 1 || polls[0].Question != "Summer date?" {
		t.Fatalf("unexpected polls: %+v", polls)
	}
	if polls[0].TotalVotes != 0 {
		t.Fatalf("expected 0 votes, got %d", polls[0].TotalVotes)
	}
}

func TestSingleChoiceVoteReplaces(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	p := createPoll(t, app, clubID, "Pick one", false, "A", "B")

	votePoll(t, app, clubID, p.ID, http.StatusNoContent, p.Options[0].ID)
	votePoll(t, app, clubID, p.ID, http.StatusNoContent, p.Options[1].ID)

	polls := listPolls(t, app, clubID)
	got := polls[0]
	if got.TotalVotes != 1 {
		t.Fatalf("single-choice re-vote must collapse to 1 total, got %d", got.TotalVotes)
	}
	for _, o := range got.Options {
		switch o.ID {
		case p.Options[0].ID:
			if o.VoteCount != 0 || o.VotedByMe {
				t.Fatalf("first option should have been replaced: %+v", o)
			}
		case p.Options[1].ID:
			if o.VoteCount != 1 || !o.VotedByMe {
				t.Fatalf("second option should hold the vote: %+v", o)
			}
		}
	}

	// A single-choice ballot with two options is rejected.
	votePoll(t, app, clubID, p.ID, http.StatusBadRequest, p.Options[0].ID, p.Options[1].ID)
}

func TestMultipleChoiceKeepsMultipleVotes(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	p := createPoll(t, app, clubID, "Pick many", true, "A", "B", "C")

	votePoll(t, app, clubID, p.ID, http.StatusNoContent, p.Options[0].ID, p.Options[2].ID)

	got := listPolls(t, app, clubID)[0]
	if got.TotalVotes != 2 {
		t.Fatalf("multiple-choice should keep 2 votes, got %d", got.TotalVotes)
	}
	voted := 0
	for _, o := range got.Options {
		if o.VotedByMe {
			voted++
		}
	}
	if voted != 2 {
		t.Fatalf("expected 2 of my options marked, got %d", voted)
	}
}

func TestNonManagerPollMutationsGet403(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	p := createPoll(t, app, clubID, "Locked", false, "A", "B")
	demoteTestUserToMember(t, app, clubID, "poll-boss")

	raw, _ := json.Marshal(map[string]any{"question": "Hijack", "options": []string{"X", "Y"}})
	createReq, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/"+clubID+"/polls", bytes.NewReader(raw))
	createReq.Header.Set("Content-Type", "application/json")
	if res, _ := app.Test(createReq); res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 creating poll as MITGLIED, got %d", res.StatusCode)
	}

	if res := doRequest(t, app, "POST", "http://localhost/api/v1/clubs/"+clubID+"/polls/"+p.ID+"/close"); res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 closing poll as MITGLIED, got %d", res.StatusCode)
	}
	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/polls/"+p.ID); res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 deleting poll as MITGLIED, got %d", res.StatusCode)
	}

	// A plain member may still vote and read.
	votePoll(t, app, clubID, p.ID, http.StatusNoContent, p.Options[0].ID)
}

func TestClosedPollRejectsVotes(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	p := createPoll(t, app, clubID, "Will close", false, "A", "B")

	if res := doRequest(t, app, "POST", "http://localhost/api/v1/clubs/"+clubID+"/polls/"+p.ID+"/close"); res.StatusCode != http.StatusNoContent {
		t.Fatalf("close expected 204, got %d", res.StatusCode)
	}
	votePoll(t, app, clubID, p.ID, http.StatusBadRequest, p.Options[0].ID)
}
