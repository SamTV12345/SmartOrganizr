package tests

import (
	db2 "api_go/db"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type chatMessage struct {
	ID        string `json:"id"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

// startChat opens a 1:1 chat between the test user and a seeded member.
func startChat(t *testing.T, app *fiber.App, clubID, recipientID string) string {
	t.Helper()
	res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/messages/chats", map[string]string{
		"recipient_user_id": recipientID,
		"content":           "Hallo",
	})
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("create chat: expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var created struct {
		ChatID string `json:"chat_id"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &created); err != nil || created.ChatID == "" {
		t.Fatalf("decode chat: %v (%s)", err, string(raw))
	}
	return created.ChatID
}

// seedMessages writes messages straight to the DB with increasing timestamps —
// far cheaper than n HTTP round trips, and it lets the test control the order.
func seedMessages(t *testing.T, chatID, senderID string, count int) {
	t.Helper()
	ctx := context.Background()
	base := time.Now().Add(-time.Duration(count+1) * time.Minute)
	for i := 0; i < count; i++ {
		id := uuid.NewString()
		if err := testQueries.CreateClubChatMessage(ctx, db2.CreateClubChatMessageParams{
			ID: id, ChatID: chatID, SenderUserID: senderID, Content: fmt.Sprintf("Nachricht %02d", i),
		}); err != nil {
			t.Fatalf("seed message %d: %v", i, err)
		}
		// created_at defaults to now for every row and has second resolution,
		// which would make the ordering ambiguous; stamp them apart explicitly.
		if _, err := testDB.Exec("UPDATE club_chat_message SET created_at = ? WHERE id = ?",
			base.Add(time.Duration(i)*time.Minute), id); err != nil {
			t.Fatalf("stamp message %d: %v", i, err)
		}
	}
}

func fetchMessages(t *testing.T, app *fiber.App, clubID, chatID, query string) []chatMessage {
	t.Helper()
	url := "http://localhost/api/v1/clubs/" + clubID + "/messages/chats/" + chatID
	if query != "" {
		url += "?" + query
	}
	res := doRequest(t, app, "GET", url)
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("list messages: expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var messages []chatMessage
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &messages); err != nil {
		t.Fatalf("decode messages: %v (%s)", err, string(raw))
	}
	return messages
}

func TestChatMessagesArePagedNewestFirstButRenderedAscending(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	seedClubMember(t, clubID, "chat-partner", "MITGLIED")
	chatID := startChat(t, app, clubID, "chat-partner")
	// The chat already holds the opening message; add 60 older ones.
	seedMessages(t, chatID, "chat-partner", 60)

	// Default: the newest page, in ascending order so the UI renders top-down.
	page := fetchMessages(t, app, clubID, chatID, "")
	if len(page) != 50 {
		t.Fatalf("default page should hold 50 messages, got %d", len(page))
	}
	for i := 1; i < len(page); i++ {
		if page[i-1].CreatedAt > page[i].CreatedAt {
			t.Fatalf("messages must be ascending, got %q before %q", page[i-1].CreatedAt, page[i].CreatedAt)
		}
	}
	// "Hallo" is the newest message (seeded ones are backdated), so it must be last.
	if page[len(page)-1].Content != "Hallo" {
		t.Fatalf("newest message must be last, got %q", page[len(page)-1].Content)
	}

	// An explicit limit takes the newest n.
	small := fetchMessages(t, app, clubID, chatID, "limit=10")
	if len(small) != 10 {
		t.Fatalf("limit=10 should hold 10 messages, got %d", len(small))
	}
	if small[len(small)-1].Content != "Hallo" {
		t.Fatalf("limited page must still end at the newest message, got %q", small[len(small)-1].Content)
	}

	// Older page: strictly before the oldest one we already have, no overlap.
	older := fetchMessages(t, app, clubID, chatID, "limit=10&before="+small[0].CreatedAt)
	if len(older) != 10 {
		t.Fatalf("older page should hold 10 messages, got %d", len(older))
	}
	seen := map[string]bool{}
	for _, message := range small {
		seen[message.ID] = true
	}
	for _, message := range older {
		if seen[message.ID] {
			t.Fatalf("older page overlaps the newer one: %+v", message)
		}
		if message.CreatedAt >= small[0].CreatedAt {
			t.Fatalf("older page must be strictly older: %q >= %q", message.CreatedAt, small[0].CreatedAt)
		}
	}
}

func TestChatMessagesIgnoreGarbagePagingParams(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	seedClubMember(t, clubID, "chat-partner", "MITGLIED")
	chatID := startChat(t, app, clubID, "chat-partner")
	seedMessages(t, chatID, "chat-partner", 3)

	// Nonsense must not turn into an error — the endpoint falls back to defaults.
	for _, query := range []string{"limit=abc", "limit=-5", "before=yesterday", "limit=0"} {
		if got := fetchMessages(t, app, clubID, chatID, query); len(got) != 4 {
			t.Fatalf("query %q should fall back to all 4 messages, got %d", query, len(got))
		}
	}
}
