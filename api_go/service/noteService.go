package service

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
	"database/sql"
	"errors"
	"github.com/google/uuid"
)

type NoteService struct {
	Queries       *db.Queries
	Ctx           context.Context
	UserService   *UserService
	AuthorService *AuthorService
	FolderService *FolderService
}

type NoteWithAuthor struct {
	Note   db.Element
	Author db.Author
	Folder db.Element
}

// loadComposerEntity returns the composer author entity for a note element, or
// an empty Author if the note has no composer or it cannot be loaded. Replaces
// the previous LEFT JOIN + sqlc.embed of authors, which failed to scan NULL
// (no composer) into the non-nullable author id.
func (n NoteService) loadComposerEntity(note db.Element, userId string) db.Author {
	if !note.ComposerIDFk.Valid {
		return db.Author{}
	}
	author, err := n.Queries.FindAuthorById(n.Ctx, db.FindAuthorByIdParams{
		ID:       note.ComposerIDFk.String,
		UserIDFk: db.NewSQLNullString(userId),
	})
	if err != nil {
		return db.Author{}
	}
	return author
}

func (n NoteService) LoadAllNotes(userId string, page *int, nameStr *string) ([]models.Note, int, error) {

	var notes []NoteWithAuthor
	var numberOfElements int64
	if page == nil {
		if nameStr == nil {
			notesRetrieved, err := n.Queries.FindAllNotesByCreator(n.Ctx, db.NewSQLNullString(userId))
			if err != nil {
				return nil, 0, err
			}
			for _, note := range notesRetrieved {
				notes = append(notes, NoteWithAuthor{
					Note:   note.Element,
					Author: n.loadComposerEntity(note.Element, userId),
					Folder: note.Element_2,
				})
			}
			numberOfElements, err = n.Queries.CountFindAllNotesByCreator(n.Ctx, db.NewSQLNullString(userId))
			if err != nil {
				return nil, 0, err
			}
		} else {
			notesRetrieved, err := n.Queries.FindAllNotesByCreatorWithSearch(n.Ctx, db.FindAllNotesByCreatorWithSearchParams{
				UserIDFk: db.NewSQLNullString(userId),
				CONCAT:   db.NewSQLNullString(*nameStr),
			})
			if err != nil {
				return nil, 0, err
			}
			for _, note := range notesRetrieved {
				notes = append(notes, NoteWithAuthor{
					Note:   note.Element,
					Author: n.loadComposerEntity(note.Element, userId),
					Folder: note.Element_2,
				})
			}
			numberOfElements, err = n.Queries.CountFindAllNotesByCreatorWithSearch(n.Ctx, db.CountFindAllNotesByCreatorWithSearchParams{
				CONCAT:   db.NewSQLNullString(*nameStr),
				UserIDFk: db.NewSQLNullString(userId),
			})
			if err != nil {
				return nil, 0, err
			}
		}
	} else {
		if nameStr == nil {
			notesRetrieved, err := n.Queries.FindAllNotesByCreatorPaged(n.Ctx, db.FindAllNotesByCreatorPagedParams{
				UserIDFk: db.NewSQLNullString(userId),
				Limit:    constants.CurrentPageSize,
				Offset:   int32(*page * constants.CurrentPageSize),
			})
			if err != nil {
				return nil, 0, err
			}
			for _, note := range notesRetrieved {
				notes = append(notes, NoteWithAuthor{
					Note:   note.Element,
					Author: n.loadComposerEntity(note.Element, userId),
					Folder: note.Element_2,
				})
			}
			numberOfElements, err = n.Queries.CountFindAllNotesByCreator(n.Ctx, db.NewSQLNullString(userId))
			if err != nil {
				return nil, 0, err
			}
		} else {
			notesRetrieved, err := n.Queries.FindAllNotesByCreatorPagedWithSearch(n.Ctx, db.FindAllNotesByCreatorPagedWithSearchParams{
				UserIDFk: db.NewSQLNullString(userId),
				Limit:    constants.CurrentPageSize,
				Offset:   int32(*page * constants.CurrentPageSize),
				CONCAT:   nameStr,
			})
			if err != nil {
				return nil, 0, err
			}
			for _, note := range notesRetrieved {
				notes = append(notes, NoteWithAuthor{
					Note:   note.Element,
					Author: n.loadComposerEntity(note.Element, userId),
					Folder: note.Element_2,
				})
			}
			numberOfElements, err = n.Queries.CountFindAllNotesByCreatorWithSearch(n.Ctx, db.CountFindAllNotesByCreatorWithSearchParams{
				CONCAT:   db.NewSQLNullString(*nameStr),
				UserIDFk: db.NewSQLNullString(userId),
			})
			if err != nil {
				return nil, 0, err
			}
		}
	}

	var creator *models.User
	var modelNotes = make([]models.Note, 0)

	for _, noteDB := range notes {
		if creator == nil {
			user, err := n.UserService.LoadUser(userId)
			if err != nil {
				return nil, 0, err
			}
			creator = user
		}
		var note = db.ConvertNoteEntityToDBVersion(noteDB.Note)
		var folder = db.ConvertFolderEntityToDBVersion(noteDB.Folder)
		var author = mappers.ConvertAuthorFromEntity(noteDB.Author)
		modelNotes = append(modelNotes, mappers.ConvertNoteFromEntity(note, *creator, author, &folder))
	}

	return modelNotes, int(numberOfElements), nil
}

func (n NoteService) LoadNote(noteId string, userId string) (models.Note, error) {
	noteDB, err := n.Queries.FindNoteById(n.Ctx, noteId)
	if err != nil {
		return models.Note{}, err
	}

	if noteDB.Element.UserIDFk.String != userId {
		return models.Note{}, errors.New("not author of note")
	}

	creator, err := n.UserService.LoadUser(userId)
	if err != nil {
		return models.Note{}, err
	}

	author, err := n.AuthorService.LoadAuthorById(noteDB.Element.ComposerIDFk.String, userId)

	if err != nil {
		return models.Note{}, err
	}
	var note = db.ConvertNoteEntityToDBVersion(noteDB.Element)
	var folder = db.ConvertFolderEntityToDBVersion(noteDB.Element_2)
	var parent = mappers.ConvertFolderFromEntity(folder, *creator)
	return mappers.ConvertNoteFromEntityWithFolderModel(note, *creator, author, &parent), nil
}

func (n NoteService) LoadNoteByParent(noteId string, userId string) (searchedNote *models.Note, previousNote *models.Note, nextNote *models.Note, index int, err error) {
	foundNote, err := n.LoadNote(noteId, userId)

	if err != nil {
		return nil, nil, nil, -1, err
	}

	if err = n.FolderService.loadSubElements(foundNote.Parent, foundNote.Creator); err != nil {
		return nil, nil, nil, -1, err
	}

	var subElements = foundNote.Parent.Elements

	previousNote, nextNote, index, err = findPreviousAndNextNote(noteId, subElements)
	if err != nil {
		return nil, nil, nil, -1, err
	}

	return &foundNote, previousNote, nextNote, index, nil
}

func findPreviousAndNextNote(noteId string, elements []models.Element) (previous *models.Note, next *models.Note, index int, err error) {
	for indexInIter, element := range elements {
		if element.Type() == "FOLDER" {
			continue
		}

		var note = element.(models.Note)
		if note.Id == noteId {
			var previousNote *models.Note
			var nextNote *models.Note
			if indexInIter > 0 {
				previousNoteMod := elements[indexInIter-1].(models.Note)
				previousNote = &previousNoteMod
			}

			if indexInIter < len(elements)-1 {
				nextNoteMod := elements[indexInIter+1].(models.Note)
				nextNote = &nextNoteMod
			}

			return previousNote, nextNote, indexInIter, nil
		}
	}
	return nil, nil, -1, errors.New("note not found")
}

func (n NoteService) DeleteNote(userId string, noteId string) error {
	var noteToDelete, err = n.Queries.FindNoteById(context.Background(), noteId)
	if err != nil {
		return err
	}
	if noteToDelete.Element.UserIDFk.String != userId {
		return errors.New("not author of note")
	}

	err = n.Queries.DeleteNotesInConcertByNoteId(context.Background(), noteId)
	if err != nil {
		return err
	}

	err = n.Queries.DeleteNote(n.Ctx, db.DeleteNoteParams{
		ID: noteId,
		UserIDFk: sql.NullString{
			String: userId,
			Valid:  true,
		},
	})
	return err
}

func (n NoteService) CreateNote(userId string, note dto.NotePostDto) (*models.Note, error) {
	var noteId, _ = uuid.NewRandom()
	var pdfContent = db.NewSQLNullString(note.PdfContent)
	var _, err = n.Queries.CreateNote(n.Ctx, db.CreateNoteParams{
		ID:            noteId.String(),
		Name:          db.NewSQLNullString(note.Name),
		Description:   db.NewSQLNullString(note.Description),
		UserIDFk:      db.NewSQLNullString(userId),
		ComposerIDFk:  db.NewSQLNullString(note.AuthorId),
		Parent:        db.NewSQLNullString(note.ParentId),
		NumberOfPages: db.NewSQLNullInt(note.NumberOfPages),
		PdfContent:    pdfContent,
	})
	if err != nil {
		return nil, err
	}
	noteModel, errLoading := n.LoadNote(noteId.String(), userId)
	if errLoading != nil {
		return nil, errLoading
	}
	return &noteModel, nil
}

func (n NoteService) UpdateNote(userId string, note models.Note) (models.Note, error) {
	var noteDB, err = n.LoadNote(note.Id, userId)
	if err != nil {
		return models.Note{}, err
	}

	if noteDB.Creator.UserId != userId {
		return models.Note{}, errors.New("not author of note")
	}

	var pdfContent sql.NullString
	if len(note.PDFContent) == 0 {
		pdfContent = sql.NullString{
			Valid: false,
		}
	} else {
		pdfContent = sql.NullString{
			String: string(note.PDFContent),
			Valid:  true,
		}
	}

	err = n.Queries.UpdateNote(n.Ctx, db.UpdateNoteParams{
		ID:            note.Id,
		Description:   db.NewSQLNullString(note.Description),
		NumberOfPages: db.NewSQLNullInt(note.NumberOfPages),
		PdfContent:    pdfContent,
		Name:          db.NewSQLNullString(note.Name),
		ComposerIDFk:  db.NewSQLNullString(note.Author.ID),
	})

	if err != nil {
		return models.Note{}, err
	}
	return note, nil
}

// AutocompleteLocalWorks returns the user's notes whose name contains the
// term. Returns minimal info (id, name, wikidata + genre when present) — the
// frontend only needs enough to recognize an existing entry.
func (n *NoteService) AutocompleteLocalWorks(userId, term string) []dto.AutocompleteWork {
	rows, err := n.Queries.FindElementsByUserAndNameLike(n.Ctx, db.FindElementsByUserAndNameLikeParams{
		UserIDFk: db.NewSQLNullString(userId),
		Term:     term,
	})
	if err != nil {
		return []dto.AutocompleteWork{}
	}
	out := make([]dto.AutocompleteWork, 0, len(rows))
	for _, r := range rows {
		w := dto.AutocompleteWork{
			ID:         r.ID,
			Name:       r.Name.String,
			WikidataID: r.WikidataID.String,
			Genre:      r.Genre.String,
		}
		if r.CompositionYear.Valid {
			v := r.CompositionYear.Int16
			w.CompositionYear = &v
		}
		out = append(out, w)
	}
	return out
}

// CreateNoteFromWikidata persists a new note populated from a WikidataWork.
// Composer is passed in already-resolved (matched / created via ResolveAuthor).
// Arranger is always nil at creation time — the user adds it manually after.
func (n *NoteService) CreateNoteFromWikidata(userId, parentId string, work WikidataWork, composer *models.Author) (models.Note, error) {
	noteId, _ := uuid.NewRandom()
	var composerIdFk sql.NullString
	if composer != nil {
		composerIdFk = db.NewSQLNullString(composer.ID)
	}
	var compYear sql.NullInt16
	if work.Year != nil {
		compYear = sql.NullInt16{Int16: *work.Year, Valid: true}
	}
	_, err := n.Queries.CreateNoteWithWikidata(context.Background(), db.CreateNoteWithWikidataParams{
		ID:              noteId.String(),
		Description:     db.NewSQLNullString(work.Description),
		Name:            db.NewSQLNullString(work.Name),
		NumberOfPages:   sql.NullInt32{},
		UserIDFk:        db.NewSQLNullString(userId),
		Parent:          db.NewSQLNullString(parentId),
		ComposerIDFk:    composerIdFk,
		ArrangerIDFk:    sql.NullString{},
		WikidataID:      db.NewNullableSQLString(work.WikidataID),
		CompositionYear: compYear,
		Genre:           db.NewSQLNullString(work.Genre),
	})
	if err != nil {
		return models.Note{}, err
	}
	return n.LoadNote(noteId.String(), userId)
}
