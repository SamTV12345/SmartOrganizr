package tests

import (
	"api_go/controllers/dto"
	"api_go/tests/builders"
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"testing"
	"time"

	"github.com/go-faker/faker/v4"
	"github.com/go-sql-driver/mysql"
	"github.com/gofiber/fiber/v3"
)

// concertTestTimeout raises fiber's 1s default: concert requests validate and
// reload every note, which adds up against the MySQL testcontainer.
var concertTestTimeout = fiber.TestConfig{Timeout: 30 * time.Second, FailOnTimeout: true}

func postJSON(t *testing.T, app *fiber.App, url string, payload any) *http.Response {
	t.Helper()
	return sendJSON(t, app, "POST", url, payload)
}

func sendJSON(t *testing.T, app *fiber.App, method string, url string, payload any) *http.Response {
	t.Helper()
	encoded, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to encode payload: %v", err)
	}
	req, _ := http.NewRequest(method, url, bytes.NewBuffer(encoded))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req, concertTestTimeout)
	if err != nil {
		t.Fatalf("%s %s failed: %v", method, url, err)
	}
	return res
}

func decodeBody[T any](t *testing.T, res *http.Response) T {
	t.Helper()
	raw, _ := io.ReadAll(res.Body)
	var out T
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("failed to decode body %q: %v", string(raw), err)
	}
	return out
}

// createNotesForConcertTest creates one author + one folder and n notes via the
// public API, returning the note ids.
func createNotesForConcertTest(t *testing.T, app *fiber.App, n int) []string {
	t.Helper()

	res := postJSON(t, app, "http://localhost/api/v1/authors", builders.CreateAuthorDto())
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 creating author, got %d", res.StatusCode)
	}
	author := decodeBody[dto.Author](t, res)

	res = postJSON(t, app, "http://localhost/api/v1/elements/folders", builders.CreateParentFolderPostDto())
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 creating folder, got %d", res.StatusCode)
	}
	folder := decodeBody[dto.Folder](t, res)

	noteIds := make([]string, 0, n)
	for i := 0; i < n; i++ {
		res = postJSON(t, app, "http://localhost/api/v1/elements/notes", dto.NotePostDto{
			AuthorId:      author.ID,
			Description:   faker.Word(),
			NumberOfPages: 3,
			ParentId:      folder.Id,
			Name:          "note-" + strconv.Itoa(i) + "-" + faker.Word(),
		})
		if res.StatusCode != http.StatusOK {
			raw, _ := io.ReadAll(res.Body)
			t.Fatalf("expected 200 creating note, got %d: %s", res.StatusCode, string(raw))
		}
		note := decodeBody[dto.Note](t, res)
		noteIds = append(noteIds, note.Id)
	}
	return noteIds
}

func concertPayload(noteIds []string) dto.ConcertPostDto {
	return dto.ConcertPostDto{
		Title:       "Sommerkonzert",
		Description: "Open Air",
		DueDate:     time.Now().Add(30 * 24 * time.Hour).UTC().Truncate(time.Second),
		Location:    "Stadthalle",
		Hints:       "Schwarze Kleidung",
		NoteIds:     noteIds,
	}
}

func createConcertViaAPI(t *testing.T, app *fiber.App, noteIds []string) dto.ConcertDto {
	t.Helper()
	res := postJSON(t, app, "http://localhost/api/v1/concerts", concertPayload(noteIds))
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200 creating concert, got %d: %s", res.StatusCode, string(raw))
	}
	return decodeBody[dto.ConcertDto](t, res)
}

func assertProgramOrder(t *testing.T, concert dto.ConcertDto, wantNoteIds []string) {
	t.Helper()
	if len(concert.NoteInConcerts) != len(wantNoteIds) {
		t.Fatalf("expected %d notes in concert, got %d", len(wantNoteIds), len(concert.NoteInConcerts))
	}
	for i, nic := range concert.NoteInConcerts {
		if nic.NoteInConcert.Id != wantNoteIds[i] {
			t.Fatalf("expected note %s at position %d, got %s", wantNoteIds[i], i, nic.NoteInConcert.Id)
		}
		if nic.PlaceInConcert != int32(i+1) {
			t.Fatalf("expected place %d, got %d", i+1, nic.PlaceInConcert)
		}
	}
}

// foreignTestDB opens a raw connection to the test container so tests can seed
// rows owned by a user other than the hardcoded test user "12345".
func foreignTestDB(t *testing.T) *sql.DB {
	t.Helper()
	ctx := t.Context()
	host, err := mysqlInstance.Host(ctx)
	if err != nil {
		t.Fatalf("container host: %v", err)
	}
	mappedPort, err := mysqlInstance.MappedPort(ctx, "3306")
	if err != nil {
		t.Fatalf("container port: %v", err)
	}
	cfg := mysql.Config{
		User:                 "test",
		Passwd:               "test",
		Net:                  "tcp",
		Addr:                 host + ":" + strconv.Itoa(int(mappedPort.Num())),
		DBName:               "test",
		AllowNativePasswords: true,
	}
	rawDB, err := sql.Open("mysql", cfg.FormatDSN())
	if err != nil {
		t.Fatalf("open raw db: %v", err)
	}
	t.Cleanup(func() { rawDB.Close() })
	return rawDB
}

func seedForeignUser(t *testing.T, rawDB *sql.DB) string {
	t.Helper()
	const foreignUserId = "foreign-user"
	if _, err := rawDB.Exec("INSERT INTO user (id, side_bar_collapsed, username) VALUES (?, 0, 'foreign')", foreignUserId); err != nil {
		t.Fatalf("seed foreign user: %v", err)
	}
	return foreignUserId
}

func TestCreateConcertWithNotesReturnsOrderedProgram(t *testing.T) {
	app := SetupTest(t)
	noteIds := createNotesForConcertTest(t, app, 3)

	concert := createConcertViaAPI(t, app, noteIds)
	if concert.Id == "" {
		t.Fatalf("concert id empty")
	}
	if concert.Location != "Stadthalle" {
		t.Fatalf("expected location to round-trip, got %q", concert.Location)
	}
	assertProgramOrder(t, concert, noteIds)

	// The list endpoint stays lean: no note program.
	res, _ := app.Test(mustGet("http://localhost/api/v1/concerts"), concertTestTimeout)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 listing concerts, got %d", res.StatusCode)
	}
	concerts := decodeBody[[]dto.ConcertDto](t, res)
	if len(concerts) != 1 {
		t.Fatalf("expected 1 concert in list, got %d", len(concerts))
	}
	if len(concerts[0].NoteInConcerts) != 0 {
		t.Fatalf("expected list response without notes, got %d", len(concerts[0].NoteInConcerts))
	}

	// The detail endpoint carries the ordered program.
	res, _ = app.Test(mustGet("http://localhost/api/v1/concerts/"+concert.Id), concertTestTimeout)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 loading concert, got %d", res.StatusCode)
	}
	assertProgramOrder(t, decodeBody[dto.ConcertDto](t, res), noteIds)
}

func TestUpdateConcertReplacesOrderAndFields(t *testing.T) {
	app := SetupTest(t)
	noteIds := createNotesForConcertTest(t, app, 3)
	concert := createConcertViaAPI(t, app, noteIds)

	// Reorder and drop the middle note.
	newOrder := []string{noteIds[2], noteIds[0]}
	payload := concertPayload(newOrder)
	payload.Title = "Winterkonzert"
	res := sendJSON(t, app, "PUT", "http://localhost/api/v1/concerts/"+concert.Id, payload)
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200 updating concert, got %d: %s", res.StatusCode, string(raw))
	}
	updated := decodeBody[dto.ConcertDto](t, res)
	if updated.Title != "Winterkonzert" {
		t.Fatalf("expected updated title, got %q", updated.Title)
	}
	assertProgramOrder(t, updated, newOrder)

	// Reload to make sure the replacement was persisted.
	res, _ = app.Test(mustGet("http://localhost/api/v1/concerts/"+concert.Id), concertTestTimeout)
	assertProgramOrder(t, decodeBody[dto.ConcertDto](t, res), newOrder)
}

func TestConcertOfForeignUserIsNotFound(t *testing.T) {
	app := SetupTest(t)
	rawDB := foreignTestDB(t)
	foreignUserId := seedForeignUser(t, rawDB)
	if _, err := rawDB.Exec("INSERT INTO concert (id, title, user_id_fk) VALUES ('foreign-concert', 'secret', ?)", foreignUserId); err != nil {
		t.Fatalf("seed foreign concert: %v", err)
	}

	res, _ := app.Test(mustGet("http://localhost/api/v1/concerts/foreign-concert"), concertTestTimeout)
	if res.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 reading foreign concert, got %d", res.StatusCode)
	}

	res = sendJSON(t, app, "PUT", "http://localhost/api/v1/concerts/foreign-concert", concertPayload(nil))
	if res.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 updating foreign concert, got %d", res.StatusCode)
	}

	req, _ := http.NewRequest("DELETE", "http://localhost/api/v1/concerts/foreign-concert", nil)
	res, _ = app.Test(req, concertTestTimeout)
	if res.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 deleting foreign concert, got %d", res.StatusCode)
	}
}

func TestConcertWithForeignNoteIsForbidden(t *testing.T) {
	app := SetupTest(t)
	rawDB := foreignTestDB(t)
	foreignUserId := seedForeignUser(t, rawDB)
	if _, err := rawDB.Exec(
		"INSERT INTO elements (id, type, name, user_id_fk) VALUES ('foreign-note', 'note', 'secret', ?)", foreignUserId,
	); err != nil {
		t.Fatalf("seed foreign note: %v", err)
	}

	// Creating a concert that references a foreign note must be rejected.
	res := postJSON(t, app, "http://localhost/api/v1/concerts", concertPayload([]string{"foreign-note"}))
	if res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 creating concert with foreign note, got %d", res.StatusCode)
	}

	// Same for smuggling one into an existing concert via update.
	concert := createConcertViaAPI(t, app, nil)
	res = sendJSON(t, app, "PUT", "http://localhost/api/v1/concerts/"+concert.Id, concertPayload([]string{"foreign-note"}))
	if res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 updating concert with foreign note, got %d", res.StatusCode)
	}
}

func mustGet(url string) *http.Request {
	req, _ := http.NewRequest("GET", url, nil)
	return req
}
