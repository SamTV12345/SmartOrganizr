package dto

type InventoryIdentifyRequest struct {
	// OcrText is the client-side tesseract output for the photographed page.
	OcrText string `json:"ocrText"`
	// ImageBase64 (optional, no data: prefix) enables the AI vision fallback.
	ImageBase64 string `json:"imageBase64,omitempty"`
	MimeType    string `json:"mimeType,omitempty"`
}

type InventorySweepCreateRequest struct {
	FolderID string `json:"folderId" validate:"required"`
}

type InventorySweepCreatedResponse struct {
	SweepID string `json:"sweepId"`
}

type InventorySightingRequest struct {
	NoteID     string `json:"noteId" validate:"required"`
	MatchedVia string `json:"matchedVia" validate:"required"` // OCR | AI | MANUAL
	Confidence *int   `json:"confidence,omitempty"`
	Incomplete bool   `json:"incomplete"`
}

type InventoryApplyMovesRequest struct {
	NoteIDs []string `json:"noteIds" validate:"required"`
}

type MappeTagResponse struct {
	TagID string `json:"tagId"`
	URL   string `json:"url"`
}
