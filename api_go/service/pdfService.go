package service

import (
	"api_go/models"
	"bytes"
	"encoding/base64"
	"io"

	"github.com/gofiber/fiber/v3"
	"github.com/pdfcpu/pdfcpu/pkg/api"
)

func init() {
	// Keep pdfcpu from writing a config dir under os.UserConfigDir on first use.
	api.DisableConfigDir()
}

// decodeStoredPDF returns the raw PDF bytes for a note's stored content.
// Uploads from the web UI store a base64 data URL
// ("data:application/pdf;base64,..."), older/raw content is passed through.
func decodeStoredPDF(content []byte) []byte {
	if i := bytes.IndexByte(content, ','); i >= 0 && bytes.HasPrefix(content, []byte("data:")) {
		if decoded, err := base64.StdEncoding.DecodeString(string(content[i+1:])); err == nil {
			return decoded
		}
	}
	return content
}

// GeneratePDFForFolder merges the stored PDFs of all notes directly inside the
// folder into a single PDF. The folder must belong to userId. Notes without a
// (valid) PDF are skipped.
func GeneratePDFForFolder(folderId string, userId string, folderservice FolderService) ([]byte, error) {
	folderToExport, err := folderservice.FindFolderByIdAndUser(folderId, userId)
	if err != nil {
		return nil, fiber.NewError(fiber.StatusNotFound, "folder not found")
	}

	var pdfs []io.ReadSeeker
	for _, element := range folderToExport.Elements {
		note, ok := element.(models.Note)
		if !ok || len(note.PDFContent) == 0 {
			continue
		}
		pdf := decodeStoredPDF(note.PDFContent)
		if !bytes.HasPrefix(pdf, []byte("%PDF")) {
			continue // ponytail: silently skip non-PDF content instead of failing the whole export
		}
		pdfs = append(pdfs, bytes.NewReader(pdf))
	}
	if len(pdfs) == 0 {
		return nil, fiber.NewError(fiber.StatusNotFound, "folder contains no notes with a PDF")
	}

	var merged bytes.Buffer
	if err := api.MergeRaw(pdfs, &merged, false, nil); err != nil {
		return nil, err
	}
	return merged.Bytes(), nil
}
