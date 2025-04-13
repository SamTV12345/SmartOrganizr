package models

import (
	"time"
)

type Note struct {
	Author        Author    `json:"author"`
	NumberOfPages int       `json:"numberOfPages"`
	PdfAvailable  bool      `json:"pdfAvailable"`
	PDFContent    []byte    `json:"pdfContent"`
	CreationDate  time.Time `json:"creationDate"`
	Id            string    `json:"id"`
	Name          string    `json:"name"`
	Parent        *Folder   `json:"parent"`
	Description   string    `json:"description"`
	Creator       User      `json:"creator"`
}

func (note Note) Type() ElementName {
	return NOTE
}

func (note Note) Compare(other Note) bool {
	return other.Id == note.Id
}

func (note Note) String() string {
	return "\nTitel:\t" +
		note.Name +
		"\n" + "Beschreibung\t" +
		note.Description +
		"\n" + "Enthaltende Ordner:\t" +
		note.Parent.Name +
		"\n" + "Autor:\t" +
		note.Author.Name
}

var _ Element = Note{}
