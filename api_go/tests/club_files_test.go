package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v3"
)

type clubFile struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	MimeType  string `json:"mimeType"`
	SizeBytes int64  `json:"sizeBytes"`
}

func uploadFile(t *testing.T, app *fiber.App, clubID, filename string, content []byte) *http.Response {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, err := w.CreateFormFile("file", filename)
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := fw.Write(content); err != nil {
		t.Fatalf("write form file: %v", err)
	}
	w.Close()
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/"+clubID+"/files", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("upload request failed: %v", err)
	}
	return res
}

func TestUploadListDownloadClubFile(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	content := []byte("file-content-123")

	res := uploadFile(t, app, clubID, "hello.txt", content)
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200 uploading, got %d: %s", res.StatusCode, string(raw))
	}
	var uploaded clubFile
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &uploaded); err != nil {
		t.Fatalf("decode uploaded: %v", err)
	}
	if uploaded.ID == "" || uploaded.Name != "hello.txt" || uploaded.SizeBytes != int64(len(content)) {
		t.Fatalf("unexpected uploaded metadata: %+v", uploaded)
	}

	listReq, _ := http.NewRequest("GET", "http://localhost/api/v1/clubs/"+clubID+"/files", nil)
	listRes, _ := app.Test(listReq)
	if listRes.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 listing files, got %d", listRes.StatusCode)
	}
	var files []clubFile
	listRaw, _ := io.ReadAll(listRes.Body)
	if err := json.Unmarshal(listRaw, &files); err != nil {
		t.Fatalf("decode files: %v", err)
	}
	if len(files) != 1 || files[0].Name != "hello.txt" {
		t.Fatalf("unexpected file list: %+v", files)
	}

	dlReq, _ := http.NewRequest("GET", "http://localhost/api/v1/clubs/"+clubID+"/files/"+uploaded.ID, nil)
	dlRes, _ := app.Test(dlReq)
	if dlRes.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 downloading, got %d", dlRes.StatusCode)
	}
	dlBody, _ := io.ReadAll(dlRes.Body)
	if !bytes.Equal(dlBody, content) {
		t.Fatalf("downloaded content mismatch: got %q", string(dlBody))
	}
}
