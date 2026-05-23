package dto

import "time"

type Note struct {
	Author        Author    `json:"author"        validate:"required"`
	NumberOfPages int       `json:"numberOfPages" validate:"required"`
	PdfAvailable  bool      `json:"pdfAvailable"  validate:"required"`
	CreationDate  time.Time `json:"creationDate"  validate:"required"`
	Id            string    `json:"id"            validate:"required"`
	Name          string    `json:"name"          validate:"required"`
	Parent        *Folder   `json:"parent"`
	Description   string    `json:"description"   validate:"required"`
	Creator       User      `json:"creator"       validate:"required"`
	Type          string    `json:"type"          validate:"required" enums:"note"`
}
