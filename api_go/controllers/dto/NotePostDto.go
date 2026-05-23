package dto

type NotePostDto struct {
	AuthorId      string `json:"authorId"      validate:"required"`
	Description   string `json:"description"   validate:"required"`
	NumberOfPages int    `json:"numberOfPages" validate:"required"`
	ParentId      string `json:"parentId"      validate:"required"`
	Name          string `json:"name"          validate:"required"`
	PdfContent    string `json:"pdfContent"`
}
