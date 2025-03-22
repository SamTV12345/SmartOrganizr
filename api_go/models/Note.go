package models

import (
	"time"
)

type Note struct {
	Title         string    `json:"title"`
	Author        Author    `json:"author"`
	NumberOfPages int       `json:"numberOfPages"`
	PdfAvailable  bool      `json:"pdfAvailable"`
	CreationDate  time.Time `json:"creationDate"`
	Id            string    `json:"id"`
	Name          string    `json:"name"`
	Parent        Folder    `json:"parent"`
	Description   string    `json:"description"`
	Creator       User      `json:"creator"`
}

func (note Note) Compare(other Note) bool {
	return other.Id == note.Id
}
