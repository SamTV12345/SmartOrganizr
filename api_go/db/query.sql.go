// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.28.0
// source: query.sql

package db

import (
	"context"
	"database/sql"
)

const countFindAllAuthorsByCreator = `-- name: CountFindAllAuthorsByCreator :one
SELECT COUNT(*) FROM authors
WHERE user_id_fk = ?
`

func (q *Queries) CountFindAllAuthorsByCreator(ctx context.Context, userIDFk sql.NullString) (int64, error) {
	row := q.db.QueryRowContext(ctx, countFindAllAuthorsByCreator, userIDFk)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const countFindAllAuthorsByCreatorAndSearchText = `-- name: CountFindAllAuthorsByCreatorAndSearchText :one
SELECT COUNT(*)
FROM authors a
WHERE a.user_id_fk = ?
  AND (a.name LIKE CONCAT('%', ?, '%')
    OR a.extra_information LIKE CONCAT('%', ?, '%'))
`

type CountFindAllAuthorsByCreatorAndSearchTextParams struct {
	UserIDFk sql.NullString
	CONCAT   interface{}
	CONCAT_2 interface{}
}

func (q *Queries) CountFindAllAuthorsByCreatorAndSearchText(ctx context.Context, arg CountFindAllAuthorsByCreatorAndSearchTextParams) (int64, error) {
	row := q.db.QueryRowContext(ctx, countFindAllAuthorsByCreatorAndSearchText, arg.UserIDFk, arg.CONCAT, arg.CONCAT_2)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const countSearchByFolderName = `-- name: CountSearchByFolderName :one
SELECT COUNT(*) FROM elements WHERE name LIKE CONCAT('%', ?, '%') and type = 'folder' AND user_id_fk = ?
`

type CountSearchByFolderNameParams struct {
	CONCAT   interface{}
	UserIDFk sql.NullString
}

func (q *Queries) CountSearchByFolderName(ctx context.Context, arg CountSearchByFolderNameParams) (int64, error) {
	row := q.db.QueryRowContext(ctx, countSearchByFolderName, arg.CONCAT, arg.UserIDFk)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const createAuthor = `-- name: CreateAuthor :execlastid
INSERT INTO authors (id, name, extra_information, user_id_fk) VALUES (?, ?, ?, ?)
`

type CreateAuthorParams struct {
	ID               string
	Name             sql.NullString
	ExtraInformation sql.NullString
	UserIDFk         sql.NullString
}

func (q *Queries) CreateAuthor(ctx context.Context, arg CreateAuthorParams) (int64, error) {
	result, err := q.db.ExecContext(ctx, createAuthor,
		arg.ID,
		arg.Name,
		arg.ExtraInformation,
		arg.UserIDFk,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

const createConcert = `-- name: CreateConcert :execlastid
INSERT INTO concert (id, title, description, location, due_date, hints, user_id_fk) VALUES (?, ?, ?, ?, ?, ?, ?)
`

type CreateConcertParams struct {
	ID          string
	Title       sql.NullString
	Description sql.NullString
	Location    sql.NullString
	DueDate     sql.NullTime
	Hints       sql.NullString
	UserIDFk    sql.NullString
}

func (q *Queries) CreateConcert(ctx context.Context, arg CreateConcertParams) (int64, error) {
	result, err := q.db.ExecContext(ctx, createConcert,
		arg.ID,
		arg.Title,
		arg.Description,
		arg.Location,
		arg.DueDate,
		arg.Hints,
		arg.UserIDFk,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

const createFolder = `-- name: CreateFolder :execlastid
INSERT INTO elements (id, type, name, description, user_id_fk, parent) VALUES (?,'folder', ?, ?, ?, ?)
`

type CreateFolderParams struct {
	ID          string
	Name        sql.NullString
	Description sql.NullString
	UserIDFk    sql.NullString
	Parent      sql.NullString
}

func (q *Queries) CreateFolder(ctx context.Context, arg CreateFolderParams) (int64, error) {
	result, err := q.db.ExecContext(ctx, createFolder,
		arg.ID,
		arg.Name,
		arg.Description,
		arg.UserIDFk,
		arg.Parent,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

const createNote = `-- name: CreateNote :execlastid
INSERT INTO elements (id, type, name, description, user_id_fk, parent, title, author_id_fk, number_of_pages) VALUES (?,'note', 'Note', ?, ?, ?, ?, ?, ?)
`

type CreateNoteParams struct {
	ID            string
	Description   sql.NullString
	UserIDFk      sql.NullString
	Parent        sql.NullString
	Title         sql.NullString
	AuthorIDFk    sql.NullString
	NumberOfPages sql.NullInt32
}

func (q *Queries) CreateNote(ctx context.Context, arg CreateNoteParams) (int64, error) {
	result, err := q.db.ExecContext(ctx, createNote,
		arg.ID,
		arg.Description,
		arg.UserIDFk,
		arg.Parent,
		arg.Title,
		arg.AuthorIDFk,
		arg.NumberOfPages,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

const createUser = `-- name: CreateUser :execlastid
INSERT INTO user (id, username, selected_theme, side_bar_collapsed) VALUES (?, ?, ?, ?)
`

type CreateUserParams struct {
	ID               string
	Username         sql.NullString
	SelectedTheme    sql.NullString
	SideBarCollapsed bool
}

func (q *Queries) CreateUser(ctx context.Context, arg CreateUserParams) (int64, error) {
	result, err := q.db.ExecContext(ctx, createUser,
		arg.ID,
		arg.Username,
		arg.SelectedTheme,
		arg.SideBarCollapsed,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

const deleteAuthor = `-- name: DeleteAuthor :exec
DELETE FROM authors WHERE id = ? AND user_id_fk = ?
`

type DeleteAuthorParams struct {
	ID       string
	UserIDFk sql.NullString
}

func (q *Queries) DeleteAuthor(ctx context.Context, arg DeleteAuthorParams) error {
	_, err := q.db.ExecContext(ctx, deleteAuthor, arg.ID, arg.UserIDFk)
	return err
}

const deleteConcert = `-- name: DeleteConcert :exec
DELETE FROM concert WHERE id = ?
`

func (q *Queries) DeleteConcert(ctx context.Context, id string) error {
	_, err := q.db.ExecContext(ctx, deleteConcert, id)
	return err
}

const deleteNote = `-- name: DeleteNote :exec
DELETE FROM elements WHERE id = ? AND user_id_fk = ?
`

type DeleteNoteParams struct {
	ID       string
	UserIDFk sql.NullString
}

func (q *Queries) DeleteNote(ctx context.Context, arg DeleteNoteParams) error {
	_, err := q.db.ExecContext(ctx, deleteNote, arg.ID, arg.UserIDFk)
	return err
}

const deleteNoteInConcert = `-- name: DeleteNoteInConcert :exec
DELETE FROM note_in_concert WHERE concert_id_fk = ? AND note_id_fk = ?
`

type DeleteNoteInConcertParams struct {
	ConcertIDFk string
	NoteIDFk    string
}

func (q *Queries) DeleteNoteInConcert(ctx context.Context, arg DeleteNoteInConcertParams) error {
	_, err := q.db.ExecContext(ctx, deleteNoteInConcert, arg.ConcertIDFk, arg.NoteIDFk)
	return err
}

const deleteNotesInConcert = `-- name: DeleteNotesInConcert :exec
DELETE FROM note_in_concert WHERE concert_id_fk = ?
`

func (q *Queries) DeleteNotesInConcert(ctx context.Context, concertIDFk string) error {
	_, err := q.db.ExecContext(ctx, deleteNotesInConcert, concertIDFk)
	return err
}

const deleteNotesInConcertByNoteId = `-- name: DeleteNotesInConcertByNoteId :exec
DELETE FROM note_in_concert WHERE note_id_fk = ?
`

func (q *Queries) DeleteNotesInConcertByNoteId(ctx context.Context, noteIDFk string) error {
	_, err := q.db.ExecContext(ctx, deleteNotesInConcertByNoteId, noteIDFk)
	return err
}

const findAllAuthorsByCreator = `-- name: FindAllAuthorsByCreator :many
SELECT id, extra_information, name, user_id_fk FROM authors
WHERE user_id_fk = ? ORDER BY name LIMIT ? OFFSET ?
`

type FindAllAuthorsByCreatorParams struct {
	UserIDFk sql.NullString
	Limit    int32
	Offset   int32
}

func (q *Queries) FindAllAuthorsByCreator(ctx context.Context, arg FindAllAuthorsByCreatorParams) ([]Author, error) {
	rows, err := q.db.QueryContext(ctx, findAllAuthorsByCreator, arg.UserIDFk, arg.Limit, arg.Offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Author
	for rows.Next() {
		var i Author
		if err := rows.Scan(
			&i.ID,
			&i.ExtraInformation,
			&i.Name,
			&i.UserIDFk,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const findAllAuthorsByCreatorAndSearchText = `-- name: FindAllAuthorsByCreatorAndSearchText :many
SELECT a.id, a.extra_information, a.name, a.user_id_fk
FROM authors a
WHERE a.user_id_fk = ?
  AND (a.name LIKE CONCAT('%', ?, '%')
    OR a.extra_information LIKE CONCAT('%', ?, '%'))
`

type FindAllAuthorsByCreatorAndSearchTextParams struct {
	UserIDFk sql.NullString
	CONCAT   interface{}
	CONCAT_2 interface{}
}

func (q *Queries) FindAllAuthorsByCreatorAndSearchText(ctx context.Context, arg FindAllAuthorsByCreatorAndSearchTextParams) ([]Author, error) {
	rows, err := q.db.QueryContext(ctx, findAllAuthorsByCreatorAndSearchText, arg.UserIDFk, arg.CONCAT, arg.CONCAT_2)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Author
	for rows.Next() {
		var i Author
		if err := rows.Scan(
			&i.ID,
			&i.ExtraInformation,
			&i.Name,
			&i.UserIDFk,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const findAllAuthorsByCreatorUnpaged = `-- name: FindAllAuthorsByCreatorUnpaged :many
SELECT id, extra_information, name, user_id_fk FROM authors WHERE user_id_fk = ? ORDER BY name
`

func (q *Queries) FindAllAuthorsByCreatorUnpaged(ctx context.Context, userIDFk sql.NullString) ([]Author, error) {
	rows, err := q.db.QueryContext(ctx, findAllAuthorsByCreatorUnpaged, userIDFk)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Author
	for rows.Next() {
		var i Author
		if err := rows.Scan(
			&i.ID,
			&i.ExtraInformation,
			&i.Name,
			&i.UserIDFk,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const findAllFoldersByCreator = `-- name: FindAllFoldersByCreator :many
SELECT type, id, creation_date, description, name, number_of_pages, title, user_id_fk, parent, author_id_fk, pdf_content FROM elements as folders WHERE type ='folder' AND user_id_fk = ? ORDER BY title
`

// type: Folder
func (q *Queries) FindAllFoldersByCreator(ctx context.Context, userIDFk sql.NullString) ([]Element, error) {
	rows, err := q.db.QueryContext(ctx, findAllFoldersByCreator, userIDFk)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Element
	for rows.Next() {
		var i Element
		if err := rows.Scan(
			&i.Type,
			&i.ID,
			&i.CreationDate,
			&i.Description,
			&i.Name,
			&i.NumberOfPages,
			&i.Title,
			&i.UserIDFk,
			&i.Parent,
			&i.AuthorIDFk,
			&i.PdfContent,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const findAllNotesByAuthor = `-- name: FindAllNotesByAuthor :many
SELECT type, id, creation_date, description, name, number_of_pages, title, user_id_fk, parent, author_id_fk, pdf_content FROM elements WHERE type ='note' AND author_id_fk = ? AND user_id_fk = ? ORDER BY title
`

type FindAllNotesByAuthorParams struct {
	AuthorIDFk sql.NullString
	UserIDFk   sql.NullString
}

func (q *Queries) FindAllNotesByAuthor(ctx context.Context, arg FindAllNotesByAuthorParams) ([]Element, error) {
	rows, err := q.db.QueryContext(ctx, findAllNotesByAuthor, arg.AuthorIDFk, arg.UserIDFk)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Element
	for rows.Next() {
		var i Element
		if err := rows.Scan(
			&i.Type,
			&i.ID,
			&i.CreationDate,
			&i.Description,
			&i.Name,
			&i.NumberOfPages,
			&i.Title,
			&i.UserIDFk,
			&i.Parent,
			&i.AuthorIDFk,
			&i.PdfContent,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const findAllNotesByCreator = `-- name: FindAllNotesByCreator :many
SELECT type, id, creation_date, description, name, number_of_pages, title, user_id_fk, parent, author_id_fk, pdf_content FROM elements WHERE type ='note' AND user_id_fk = ? ORDER BY title
`

func (q *Queries) FindAllNotesByCreator(ctx context.Context, userIDFk sql.NullString) ([]Element, error) {
	rows, err := q.db.QueryContext(ctx, findAllNotesByCreator, userIDFk)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Element
	for rows.Next() {
		var i Element
		if err := rows.Scan(
			&i.Type,
			&i.ID,
			&i.CreationDate,
			&i.Description,
			&i.Name,
			&i.NumberOfPages,
			&i.Title,
			&i.UserIDFk,
			&i.Parent,
			&i.AuthorIDFk,
			&i.PdfContent,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const findAllNotesInConcertByPlace = `-- name: FindAllNotesInConcertByPlace :many
SELECT concert_id_fk, note_id_fk, place_in_concert FROM note_in_concert WHERE concert_id_fk = ? ORDER BY place_in_concert
`

func (q *Queries) FindAllNotesInConcertByPlace(ctx context.Context, concertIDFk string) ([]NoteInConcert, error) {
	rows, err := q.db.QueryContext(ctx, findAllNotesInConcertByPlace, concertIDFk)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []NoteInConcert
	for rows.Next() {
		var i NoteInConcert
		if err := rows.Scan(&i.ConcertIDFk, &i.NoteIDFk, &i.PlaceInConcert); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const findAllParentFolders = `-- name: FindAllParentFolders :many
SELECT type, id, creation_date, description, name, number_of_pages, title, user_id_fk, parent, author_id_fk, pdf_content FROM elements WHERE parent IS NULL AND type = 'folder' AND user_id_fk = ? ORDER BY title
`

func (q *Queries) FindAllParentFolders(ctx context.Context, userIDFk sql.NullString) ([]Element, error) {
	rows, err := q.db.QueryContext(ctx, findAllParentFolders, userIDFk)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Element
	for rows.Next() {
		var i Element
		if err := rows.Scan(
			&i.Type,
			&i.ID,
			&i.CreationDate,
			&i.Description,
			&i.Name,
			&i.NumberOfPages,
			&i.Title,
			&i.UserIDFk,
			&i.Parent,
			&i.AuthorIDFk,
			&i.PdfContent,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const findAllSubElements = `-- name: FindAllSubElements :many
SELECT type, elements.id, creation_date, description, elements.name, number_of_pages, title, elements.user_id_fk, parent, author_id_fk, pdf_content, authors.id, extra_information, authors.name, authors.user_id_fk FROM elements LEFT JOIN authors ON elements.author_id_fk = authors.id WHERE parent = ? AND elements.user_id_fk = ? ORDER BY title
`

type FindAllSubElementsParams struct {
	Parent   sql.NullString
	UserIDFk sql.NullString
}

type FindAllSubElementsRow struct {
	Type             string
	ID               string
	CreationDate     sql.NullTime
	Description      sql.NullString
	Name             sql.NullString
	NumberOfPages    sql.NullInt32
	Title            sql.NullString
	UserIDFk         sql.NullString
	Parent           sql.NullString
	AuthorIDFk       sql.NullString
	PdfContent       sql.NullString
	ID_2             sql.NullString
	ExtraInformation sql.NullString
	Name_2           sql.NullString
	UserIDFk_2       sql.NullString
}

func (q *Queries) FindAllSubElements(ctx context.Context, arg FindAllSubElementsParams) ([]FindAllSubElementsRow, error) {
	rows, err := q.db.QueryContext(ctx, findAllSubElements, arg.Parent, arg.UserIDFk)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []FindAllSubElementsRow
	for rows.Next() {
		var i FindAllSubElementsRow
		if err := rows.Scan(
			&i.Type,
			&i.ID,
			&i.CreationDate,
			&i.Description,
			&i.Name,
			&i.NumberOfPages,
			&i.Title,
			&i.UserIDFk,
			&i.Parent,
			&i.AuthorIDFk,
			&i.PdfContent,
			&i.ID_2,
			&i.ExtraInformation,
			&i.Name_2,
			&i.UserIDFk_2,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const findAuthorById = `-- name: FindAuthorById :one
SELECT id, extra_information, name, user_id_fk FROM authors WHERE id = ? and user_id_fk = ?
`

type FindAuthorByIdParams struct {
	ID       string
	UserIDFk sql.NullString
}

func (q *Queries) FindAuthorById(ctx context.Context, arg FindAuthorByIdParams) (Author, error) {
	row := q.db.QueryRowContext(ctx, findAuthorById, arg.ID, arg.UserIDFk)
	var i Author
	err := row.Scan(
		&i.ID,
		&i.ExtraInformation,
		&i.Name,
		&i.UserIDFk,
	)
	return i, err
}

const findConcertById = `-- name: FindConcertById :one
SELECT id, description, due_date, hints, location, title, user_id_fk FROM concert WHERE id = ?
`

func (q *Queries) FindConcertById(ctx context.Context, id string) (Concert, error) {
	row := q.db.QueryRowContext(ctx, findConcertById, id)
	var i Concert
	err := row.Scan(
		&i.ID,
		&i.Description,
		&i.DueDate,
		&i.Hints,
		&i.Location,
		&i.Title,
		&i.UserIDFk,
	)
	return i, err
}

const findConcertByIdAndUser = `-- name: FindConcertByIdAndUser :one
SELECT id, description, due_date, hints, location, title, user_id_fk FROM concert WHERE id = ? AND user_id_fk = ?
`

type FindConcertByIdAndUserParams struct {
	ID       string
	UserIDFk sql.NullString
}

func (q *Queries) FindConcertByIdAndUser(ctx context.Context, arg FindConcertByIdAndUserParams) (Concert, error) {
	row := q.db.QueryRowContext(ctx, findConcertByIdAndUser, arg.ID, arg.UserIDFk)
	var i Concert
	err := row.Scan(
		&i.ID,
		&i.Description,
		&i.DueDate,
		&i.Hints,
		&i.Location,
		&i.Title,
		&i.UserIDFk,
	)
	return i, err
}

const findConcertsOfUserSortedByDate = `-- name: FindConcertsOfUserSortedByDate :many
SELECT id, description, due_date, hints, location, title, user_id_fk FROM concert WHERE user_id_fk = ? ORDER BY due_date DESC
`

func (q *Queries) FindConcertsOfUserSortedByDate(ctx context.Context, userIDFk sql.NullString) ([]Concert, error) {
	rows, err := q.db.QueryContext(ctx, findConcertsOfUserSortedByDate, userIDFk)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Concert
	for rows.Next() {
		var i Concert
		if err := rows.Scan(
			&i.ID,
			&i.Description,
			&i.DueDate,
			&i.Hints,
			&i.Location,
			&i.Title,
			&i.UserIDFk,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const findFolderById = `-- name: FindFolderById :one
SELECT type, id, creation_date, description, name, number_of_pages, title, user_id_fk, parent, author_id_fk, pdf_content FROM elements WHERE id = ? and user_id_fk = ?
`

type FindFolderByIdParams struct {
	ID       string
	UserIDFk sql.NullString
}

func (q *Queries) FindFolderById(ctx context.Context, arg FindFolderByIdParams) (Element, error) {
	row := q.db.QueryRowContext(ctx, findFolderById, arg.ID, arg.UserIDFk)
	var i Element
	err := row.Scan(
		&i.Type,
		&i.ID,
		&i.CreationDate,
		&i.Description,
		&i.Name,
		&i.NumberOfPages,
		&i.Title,
		&i.UserIDFk,
		&i.Parent,
		&i.AuthorIDFk,
		&i.PdfContent,
	)
	return i, err
}

const findNoteById = `-- name: FindNoteById :one
SELECT type, id, creation_date, description, name, number_of_pages, title, user_id_fk, parent, author_id_fk, pdf_content FROM elements WHERE type ='note' AND id = ?
`

// type: Note
func (q *Queries) FindNoteById(ctx context.Context, id string) (Element, error) {
	row := q.db.QueryRowContext(ctx, findNoteById, id)
	var i Element
	err := row.Scan(
		&i.Type,
		&i.ID,
		&i.CreationDate,
		&i.Description,
		&i.Name,
		&i.NumberOfPages,
		&i.Title,
		&i.UserIDFk,
		&i.Parent,
		&i.AuthorIDFk,
		&i.PdfContent,
	)
	return i, err
}

const findUserById = `-- name: FindUserById :one
SELECT id, selected_theme, side_bar_collapsed, username FROM user WHERE id = ?
`

func (q *Queries) FindUserById(ctx context.Context, id string) (User, error) {
	row := q.db.QueryRowContext(ctx, findUserById, id)
	var i User
	err := row.Scan(
		&i.ID,
		&i.SelectedTheme,
		&i.SideBarCollapsed,
		&i.Username,
	)
	return i, err
}

const getIndexAuthorsOnPage = `-- name: GetIndexAuthorsOnPage :many
SELECT COUNT(*) FROM authors a WHERE a.name<? ORDER BY a.name,a.id
`

func (q *Queries) GetIndexAuthorsOnPage(ctx context.Context, name sql.NullString) ([]int64, error) {
	rows, err := q.db.QueryContext(ctx, getIndexAuthorsOnPage, name)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []int64
	for rows.Next() {
		var count int64
		if err := rows.Scan(&count); err != nil {
			return nil, err
		}
		items = append(items, count)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const healthCheck = `-- name: HealthCheck :one
SELECT 1
`

func (q *Queries) HealthCheck(ctx context.Context) (int32, error) {
	row := q.db.QueryRowContext(ctx, healthCheck)
	var column_1 int32
	err := row.Scan(&column_1)
	return column_1, err
}

const searchByFolderName = `-- name: SearchByFolderName :many
SELECT type, id, creation_date, description, name, number_of_pages, title, user_id_fk, parent, author_id_fk, pdf_content FROM elements WHERE name LIKE CONCAT('%', ?, '%') and type = 'folder' AND user_id_fk = ? ORDER BY title LIMIT ? OFFSET ?
`

type SearchByFolderNameParams struct {
	CONCAT   interface{}
	UserIDFk sql.NullString
	Limit    int32
	Offset   int32
}

func (q *Queries) SearchByFolderName(ctx context.Context, arg SearchByFolderNameParams) ([]Element, error) {
	rows, err := q.db.QueryContext(ctx, searchByFolderName,
		arg.CONCAT,
		arg.UserIDFk,
		arg.Limit,
		arg.Offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Element
	for rows.Next() {
		var i Element
		if err := rows.Scan(
			&i.Type,
			&i.ID,
			&i.CreationDate,
			&i.Description,
			&i.Name,
			&i.NumberOfPages,
			&i.Title,
			&i.UserIDFk,
			&i.Parent,
			&i.AuthorIDFk,
			&i.PdfContent,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const updateAuthor = `-- name: UpdateAuthor :exec
UPDATE authors SET name = ?, extra_information = ? WHERE id = ?
`

type UpdateAuthorParams struct {
	Name             sql.NullString
	ExtraInformation sql.NullString
	ID               string
}

func (q *Queries) UpdateAuthor(ctx context.Context, arg UpdateAuthorParams) error {
	_, err := q.db.ExecContext(ctx, updateAuthor, arg.Name, arg.ExtraInformation, arg.ID)
	return err
}

const updateNote = `-- name: UpdateNote :exec
UPDATE elements SET name = ?, description = ?, title = ?, author_id_fk = ?, number_of_pages = ?, pdf_content = ? WHERE id = ?
`

type UpdateNoteParams struct {
	Name          sql.NullString
	Description   sql.NullString
	Title         sql.NullString
	AuthorIDFk    sql.NullString
	NumberOfPages sql.NullInt32
	PdfContent    sql.NullString
	ID            string
}

func (q *Queries) UpdateNote(ctx context.Context, arg UpdateNoteParams) error {
	_, err := q.db.ExecContext(ctx, updateNote,
		arg.Name,
		arg.Description,
		arg.Title,
		arg.AuthorIDFk,
		arg.NumberOfPages,
		arg.PdfContent,
		arg.ID,
	)
	return err
}

const updateUser = `-- name: UpdateUser :exec
UPDATE user SET username = ?, selected_theme = ?, side_bar_collapsed = ? WHERE id = ?
`

type UpdateUserParams struct {
	Username         sql.NullString
	SelectedTheme    sql.NullString
	SideBarCollapsed bool
	ID               string
}

func (q *Queries) UpdateUser(ctx context.Context, arg UpdateUserParams) error {
	_, err := q.db.ExecContext(ctx, updateUser,
		arg.Username,
		arg.SelectedTheme,
		arg.SideBarCollapsed,
		arg.ID,
	)
	return err
}
