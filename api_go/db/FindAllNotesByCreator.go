package db

import "time"

func (note FindAllNotesByCreatorRow) GetCreationDate() time.Time {
	return note.GetCreationDate()
}

func (note FindAllNotesByCreatorRow) GetId() string {
	return note.ID
}

func (note FindAllNotesByCreatorRow) GetName() string {
	return note.Name.String
}

func (note FindAllNotesByCreatorRow) GetParent() string {
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

func (note FindAllNotesByCreatorRow) GetAuthor() string {
	return note.AuthorIDFk.String
}

func (note FindAllNotesByCreatorRow) GetNumberOfPages() int {
	return int(note.NumberOfPages.Int32)
}

func (note FindAllNotesByCreatorRow) GetPdfAvailable() bool {
	return note.PdfAvailable.Bool
}
