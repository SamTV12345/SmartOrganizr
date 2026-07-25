package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v3"
)

// pinboardPost mirrors the fields the API returns; defined locally so the test
// compiles independently of the production DTO.
type pinboardPost struct {
	ID         string `json:"id"`
	ClubID     string `json:"clubId"`
	AuthorName string `json:"authorName"`
	Title      string `json:"title"`
	Body       string `json:"body"`
	Pinned     bool   `json:"pinned"`
}

func createClubForTest(t *testing.T, app *fiber.App) string {
	t.Helper()
	body := `{"name":"Test Club","club_type":"musikverein","street":"Main","house_number":"1",` +
		`"location":"Town","postal_code":"12345","country":"DE","dates_visible_for_all_members":true,` +
		`"members_can_send_messages":true,"feedback_visibility":"all","reason_visibility":"all",` +
		`"confirmed_representative":true}`
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("create club request failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200 creating club, got %d: %s", res.StatusCode, string(raw))
	}
	var club struct {
		ID string `json:"id"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &club); err != nil {
		t.Fatalf("decode club: %v", err)
	}
	if club.ID == "" {
		t.Fatalf("club id empty")
	}
	return club.ID
}

func TestCreateAndListPinboardPost(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)

	postBody := `{"title":"Hello","body":"World","pinned":false}`
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/"+clubID+"/pinboard", bytes.NewBufferString(postBody))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("create pinboard post request failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200 creating post, got %d: %s", res.StatusCode, string(raw))
	}

	listReq, _ := http.NewRequest("GET", "http://localhost/api/v1/clubs/"+clubID+"/pinboard", nil)
	listRes, err := app.Test(listReq)
	if err != nil {
		t.Fatalf("list pinboard request failed: %v", err)
	}
	if listRes.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 listing posts, got %d", listRes.StatusCode)
	}
	var posts []pinboardPost
	raw, _ := io.ReadAll(listRes.Body)
	if err := json.Unmarshal(raw, &posts); err != nil {
		t.Fatalf("decode posts: %v", err)
	}
	if len(posts) != 1 {
		t.Fatalf("expected 1 post, got %d", len(posts))
	}
	if posts[0].Title != "Hello" || posts[0].Body != "World" {
		t.Fatalf("unexpected post content: %+v", posts[0])
	}
}

func TestRecentPinboardForUserIncludesClubName(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)

	postBody := `{"title":"News","body":"Body","pinned":true}`
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/"+clubID+"/pinboard", bytes.NewBufferString(postBody))
	req.Header.Set("Content-Type", "application/json")
	if _, err := app.Test(req); err != nil {
		t.Fatalf("create post failed: %v", err)
	}

	// The dev-mode mocked user id is "12345".
	recentReq, _ := http.NewRequest("GET", "http://localhost/api/v1/users/12345/pinboard/recent", nil)
	recentRes, err := app.Test(recentReq)
	if err != nil {
		t.Fatalf("recent request failed: %v", err)
	}
	if recentRes.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", recentRes.StatusCode)
	}
	var posts []pinboardPost
	raw, _ := io.ReadAll(recentRes.Body)
	if err := json.Unmarshal(raw, &posts); err != nil {
		t.Fatalf("decode recent: %v", err)
	}
	if len(posts) != 1 {
		t.Fatalf("expected 1 recent post, got %d", len(posts))
	}
	if posts[0].ClubID != clubID {
		t.Fatalf("expected clubId %s, got %s", clubID, posts[0].ClubID)
	}
}

func TestPinboardIsPagedWithPinnedFirst(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)

	// 25 posts, the last one pinned so it has to lead the first page.
	for i := 0; i < 25; i++ {
		body := map[string]any{
			"title":  fmt.Sprintf("Beitrag %02d", i),
			"body":   "Inhalt",
			"pinned": i == 24,
		}
		if res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/pinboard", body); res.StatusCode != http.StatusOK {
			raw, _ := io.ReadAll(res.Body)
			t.Fatalf("create post %d: got %d: %s", i, res.StatusCode, string(raw))
		}
	}

	list := func(query string) []struct {
		Title  string `json:"title"`
		Pinned bool   `json:"pinned"`
	} {
		t.Helper()
		url := "http://localhost/api/v1/clubs/" + clubID + "/pinboard"
		if query != "" {
			url += "?" + query
		}
		res := doRequest(t, app, "GET", url)
		if res.StatusCode != http.StatusOK {
			t.Fatalf("list pinboard: got %d", res.StatusCode)
		}
		var posts []struct {
			Title  string `json:"title"`
			Pinned bool   `json:"pinned"`
		}
		raw, _ := io.ReadAll(res.Body)
		if err := json.Unmarshal(raw, &posts); err != nil {
			t.Fatalf("decode posts: %v (%s)", err, string(raw))
		}
		return posts
	}

	first := list("")
	if len(first) != 20 {
		t.Fatalf("default page should hold 20 posts, got %d", len(first))
	}
	if !first[0].Pinned {
		t.Fatalf("pinned post must lead the page, got %+v", first[0])
	}

	second := list("limit=10&offset=20")
	if len(second) != 5 {
		t.Fatalf("second page should hold the remaining 5 posts, got %d", len(second))
	}
	seen := map[string]bool{}
	for _, post := range first {
		seen[post.Title] = true
	}
	for _, post := range second {
		if seen[post.Title] {
			t.Fatalf("pages overlap at %q", post.Title)
		}
	}

	// Garbage falls back to the default page instead of erroring.
	if got := list("limit=abc&offset=-3"); len(got) != 20 {
		t.Fatalf("garbage paging should fall back to 20, got %d", len(got))
	}
}
