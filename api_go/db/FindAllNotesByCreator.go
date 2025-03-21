package db

import "time"

func (note FindAllNotesByCreatorRow) GetCreationDate() time.Time {
	return note.GetCreationDate()
}

func (note FindAllNotesByCreatorRow) GetId() int32 {
	return note.ID
}

func (note FindAllNotesByCreatorRow) GetName() string {
	return note.Name.String
}

func (note FindAllNotesByCreatorRow) GetParent() int32 {
	return note.ID
}

func (note FindAllNotesByCreatorRow) GetDescription() string {
	return note.Description.String
}

func (note FindAllNotesByCreatorRow) GetCreator() string {
	return note.UserIDFk.String
}

func (note FindAllNotesByCreatorRow) GetType() string {
	return "NOTE"
}

func (note FindAllNotesByCreatorRow) GetTitle() string {
	return note.Title.String
}

func (note FindAllNotesByCreatorRow) GetAuthor() int32 {
	return note.AuthorIDFk.Int32
}

func (note FindAllNotesByCreatorRow) GetNumberOfPages() int {
	return int(note.NumberOfPages.Int32)
}

func (note FindAllNotesByCreatorRow) GetPdfAvailable() bool {
	return note.PdfAvailable.Bool
}
