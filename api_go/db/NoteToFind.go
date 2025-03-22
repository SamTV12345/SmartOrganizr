package db

import "time"

func (note FindNoteByIdRow) GetCreationDate() time.Time {
	return note.GetCreationDate()
}

func (note FindNoteByIdRow) GetId() int32 {
	return note.ID
}

func (note FindNoteByIdRow) GetName() string {
	return note.Name.String
}

func (note FindNoteByIdRow) GetParent() int32 {
	return note.ID
}

func (note FindNoteByIdRow) GetDescription() string {
	return note.Description.String
}

func (note FindNoteByIdRow) GetCreator() string {
	return note.UserIDFk.String
}

func (note FindNoteByIdRow) GetType() string {
	return "NOTE"
}

func (note FindNoteByIdRow) GetTitle() string {
	return note.Title.String
}

func (note FindNoteByIdRow) GetAuthor() int32 {
	return note.AuthorIDFk.Int32
}

func (note FindNoteByIdRow) GetNumberOfPages() int {
	return int(note.NumberOfPages.Int32)
}

func (note FindNoteByIdRow) GetPdfAvailable() bool {
	return note.PdfAvailable.Bool
}
