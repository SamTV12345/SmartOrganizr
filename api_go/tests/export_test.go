package tests

import (
	"api_go/controllers/dto"
	db2 "api_go/db"
	"api_go/tests/builders"
	"api_go/tests/encodingHelper"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"

	"github.com/go-faker/faker/v4"
	"github.com/gofiber/fiber/v3"
)

// tinyPDF builds a minimal but valid single-page PDF with a correct xref table.
func tinyPDF() []byte {
	var buf bytes.Buffer
	offsets := make([]int, 4)
	buf.WriteString("%PDF-1.4\n")
	offsets[1] = buf.Len()
	buf.WriteString("1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n")
	offsets[2] = buf.Len()
	buf.WriteString("2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n")
	offsets[3] = buf.Len()
	buf.WriteString("3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]>>\nendobj\n")
	xref := buf.Len()
	buf.WriteString("xref\n0 4\n0000000000 65535 f \n")
	for i := 1; i <= 3; i++ {
		fmt.Fprintf(&buf, "%010d 00000 n \n", offsets[i])
	}
	fmt.Fprintf(&buf, "trailer\n<</Size 4 /Root 1 0 R>>\nstartxref\n%d\n%%%%EOF\n", xref)
	return buf.Bytes()
}

func postJSON(t *testing.T, app *fiber.App, url string, body any) *http.Response {
	t.Helper()
	encoded, _ := json.Marshal(body)
	request, _ := http.NewRequest("POST", url, bytes.NewBuffer(encoded))
	request.Header.Set("Content-Type", "application/json")
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("request to %s failed: %v", url, err)
	}
	return response
}

func TestExportFolderMergesNotePDFs(t *testing.T) {
	app := SetupTest(t)

	// Folder owned by the test user.
	folderRes := postJSON(t, app, "http://localhost/api/v1/elements/folders", builders.CreateParentFolderPostDto())
	if folderRes.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 creating folder, got %d", folderRes.StatusCode)
	}
	raw, _ := io.ReadAll(folderRes.Body)
	var folder dto.Folder
	encodingHelper.Decode(raw, &folder)

	// Author for the note.
	authorRes := postJSON(t, app, "http://localhost/api/v1/authors", builders.CreateAuthorDto())
	if authorRes.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 creating author, got %d", authorRes.StatusCode)
	}
	raw, _ = io.ReadAll(authorRes.Body)
	var author dto.Author
	if err := json.Unmarshal(raw, &author); err != nil {
		t.Fatalf("decode author: %v", err)
	}

	// One note with a real PDF, one without (must be skipped, not break the export).
	noteRes := postJSON(t, app, "http://localhost/api/v1/elements/notes", dto.NotePostDto{
		AuthorId:      author.ID,
		Description:   faker.Word(),
		NumberOfPages: 1,
		ParentId:      folder.Id,
		Name:          faker.Word(),
		PdfContent:    string(tinyPDF()),
	})
	if noteRes.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(noteRes.Body)
		t.Fatalf("expected 200 creating note, got %d: %s", noteRes.StatusCode, string(raw))
	}
	noteWithoutPDF := postJSON(t, app, "http://localhost/api/v1/elements/notes", dto.NotePostDto{
		AuthorId:      author.ID,
		Description:   faker.Word(),
		NumberOfPages: 1,
		ParentId:      folder.Id,
		Name:          faker.Word(),
	})
	if noteWithoutPDF.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 creating pdf-less note, got %d", noteWithoutPDF.StatusCode)
	}

	// Export the folder — must return one merged PDF.
	exportReq, _ := http.NewRequest("GET", "http://localhost/api/v1/elements/"+folder.Id+"/export", nil)
	exportRes, err := app.Test(exportReq)
	if err != nil {
		t.Fatalf("export request failed: %v", err)
	}
	if exportRes.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(exportRes.Body)
		t.Fatalf("expected 200 exporting folder, got %d: %s", exportRes.StatusCode, string(raw))
	}
	body, _ := io.ReadAll(exportRes.Body)
	if !bytes.HasPrefix(body, []byte("%PDF")) {
		t.Fatalf("expected merged PDF (magic bytes %%PDF), got %q", string(body[:min(len(body), 32)]))
	}
	if ct := exportRes.Header.Get("Content-Type"); ct != "application/pdf" {
		t.Fatalf("expected Content-Type application/pdf, got %q", ct)
	}
}

func TestExportForeignFolderIsRejected(t *testing.T) {
	app := SetupTest(t)
	ctx := context.Background()

	// Seed a folder owned by a different user directly in the DB — the auth
	// stub pins the requesting user to "12345", so this folder is foreign.
	foreignUser := faker.UUIDHyphenated()
	if _, err := testQueries.CreateUser(ctx, db2.CreateUserParams{
		ID:       foreignUser,
		Username: db2.NewSQLNullString("foreign"),
	}); err != nil {
		t.Fatalf("failed to seed foreign user: %v", err)
	}
	foreignFolder := faker.UUIDHyphenated()
	if _, err := testQueries.CreateFolder(ctx, db2.CreateFolderParams{
		ID:       foreignFolder,
		Name:     db2.NewSQLNullString("foreign folder"),
		UserIDFk: db2.NewSQLNullString(foreignUser),
	}); err != nil {
		t.Fatalf("failed to seed foreign folder: %v", err)
	}

	exportReq, _ := http.NewRequest("GET", "http://localhost/api/v1/elements/"+foreignFolder+"/export", nil)
	exportRes, err := app.Test(exportReq)
	if err != nil {
		t.Fatalf("export request failed: %v", err)
	}
	if exportRes.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 exporting a foreign folder, got %d", exportRes.StatusCode)
	}
}
