package db

import (
	"database/sql"
	"time"
)

type Note struct {
	CreationDate  sql.NullTime
	ID            string
	Name          sql.NullString
	Parent        sql.NullString
	Description   sql.NullString
	UserIDFk      sql.NullString
	Title         sql.NullString
	AuthorIDFk    sql.NullString
	NumberOfPages sql.NullInt32
	PdfContent    sql.RawBytes
	PdfAvailable  bool
}

func (n Note) GetCreationDate() time.Time {
	return n.CreationDate.Time
}

func (n Note) GetId() string {
	return n.ID
}

func (n Note) GetName() string {
	return n.Name.String
}

func (n Note) GetParent() string {
	return n.Parent.String
}

func (n Note) GetDescription() string {
	return n.Description.String
}

func (n Note) GetCreator() string {
	return n.UserIDFk.String
}

func (n Note) GetType() string {
	return "NOTE"
}

func (n Note) GetPdfContent() []byte {
	return n.PdfContent
}

var _ IElement = Note{}
