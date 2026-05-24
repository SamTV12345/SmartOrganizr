package dto

import "time"

type Note struct {
	Author          Author    `json:"author"        validate:"required"`
	Arranger        *Author   `json:"arranger,omitempty"`
	NumberOfPages   int       `json:"numberOfPages" validate:"required"`
	PdfAvailable    bool      `json:"pdfAvailable"  validate:"required"`
	CreationDate    time.Time `json:"creationDate"  validate:"required"`
	Id              string    `json:"id"            validate:"required"`
	Name            string    `json:"name"          validate:"required"`
	Parent          *Folder   `json:"parent"`
	Description     string    `json:"description"   validate:"required"`
	Creator         User      `json:"creator"       validate:"required"`
	Type            string    `json:"type"          validate:"required" enums:"note"`
	WikidataID      string    `json:"wikidataId,omitempty"`
	CompositionYear *int16    `json:"compositionYear,omitempty"`
	Genre           string    `json:"genre,omitempty"`
}
