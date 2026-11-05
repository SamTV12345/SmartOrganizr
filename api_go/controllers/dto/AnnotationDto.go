package dto

// SheetAnnotationPageDto is one page of a player's annotations on a PDF. Data is
// an opaque JSON document written by the client (strokes, text notes).
type SheetAnnotationPageDto struct {
	Page      int    `json:"page"      validate:"required"`
	Data      string `json:"data"      validate:"required"`
	UpdatedAt string `json:"updatedAt" validate:"required"`
}

type SheetAnnotationsDto struct {
	Key   string                   `json:"key"   validate:"required"`
	Pages []SheetAnnotationPageDto `json:"pages" validate:"required"`
}

// SheetAnnotationPutDto replaces the annotations of one page; an empty document deletes them.
type SheetAnnotationPutDto struct {
	Key  string `json:"key"  validate:"required"`
	Page int    `json:"page" validate:"required"`
	Data string `json:"data" validate:"required"`
}
