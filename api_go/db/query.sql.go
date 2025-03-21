// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.28.0
// source: query.sql

package db

import (
	"context"
	"database/sql"
)

const createAuthor = `-- name: CreateAuthor :execlastid
INSERT INTO authors (name, extra_information, user_id_fk) VALUES (?, ?, ?)
`

type CreateAuthorParams struct {
	Name             sql.NullString
	ExtraInformation sql.NullString
	UserIDFk         sql.NullString
}

func (q *Queries) CreateAuthor(ctx context.Context, arg CreateAuthorParams) (int64, error) {
	result, err := q.db.ExecContext(ctx, createAuthor, arg.Name, arg.ExtraInformation, arg.UserIDFk)
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

const createUser = `-- name: CreateUser :execlastid
INSERT INTO user (user_id, username, selected_theme, side_bar_collapsed) VALUES (?, ?, ?, ?)
`

type CreateUserParams struct {
	UserID           string
	Username         sql.NullString
	SelectedTheme    sql.NullString
	SideBarCollapsed bool
}

func (q *Queries) CreateUser(ctx context.Context, arg CreateUserParams) (int64, error) {
	result, err := q.db.ExecContext(ctx, createUser,
		arg.UserID,
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
	ID       int32
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

const deleteNoteInConcert = `-- name: DeleteNoteInConcert :exec
DELETE FROM note_in_concert WHERE concert_id_fk = ? AND note_id_fk = ?
`

type DeleteNoteInConcertParams struct {
	ConcertIDFk string
	NoteIDFk    int32
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

const findAllAuthorsByCreatorAndSearchText = `-- name: FindAllAuthorsByCreatorAndSearchText :many
SELECT a.id, a.extra_information, a.name, a.user_id_fk
FROM authors a
         JOIN user c ON a.user_id_fk = c.user_id
WHERE c.user_id = ?
  AND (a.name LIKE CONCAT('%', ?, '%')
    OR a.extra_information LIKE CONCAT('%', ?, '%'))
`

type FindAllAuthorsByCreatorAndSearchTextParams struct {
	UserID   string
	CONCAT   interface{}
	CONCAT_2 interface{}
}

func (q *Queries) FindAllAuthorsByCreatorAndSearchText(ctx context.Context, arg FindAllAuthorsByCreatorAndSearchTextParams) ([]Author, error) {
	rows, err := q.db.QueryContext(ctx, findAllAuthorsByCreatorAndSearchText, arg.UserID, arg.CONCAT, arg.CONCAT_2)
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

const findAllByCreator = `-- name: FindAllByCreator :many
SELECT id, extra_information, name, user_id_fk FROM authors
WHERE user_id_fk = ? ORDER BY name LIMIT ? OFFSET ?
`

type FindAllByCreatorParams struct {
	UserIDFk sql.NullString
	Limit    int32
	Offset   int32
}

func (q *Queries) FindAllByCreator(ctx context.Context, arg FindAllByCreatorParams) ([]Author, error) {
	rows, err := q.db.QueryContext(ctx, findAllByCreator, arg.UserIDFk, arg.Limit, arg.Offset)
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
SELECT creation_date, id, name, parent, description, user_id_fk FROM elements as folders WHERE type ='folder' AND user_id_fk = ? ORDER BY title
`

type FindAllFoldersByCreatorRow struct {
	CreationDate sql.NullTime
	ID           int32
	Name         sql.NullString
	Parent       sql.NullInt32
	Description  sql.NullString
	UserIDFk     sql.NullString
}

// type: Folder
func (q *Queries) FindAllFoldersByCreator(ctx context.Context, userIDFk sql.NullString) ([]FindAllFoldersByCreatorRow, error) {
	rows, err := q.db.QueryContext(ctx, findAllFoldersByCreator, userIDFk)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []FindAllFoldersByCreatorRow
	for rows.Next() {
		var i FindAllFoldersByCreatorRow
		if err := rows.Scan(
			&i.CreationDate,
			&i.ID,
			&i.Name,
			&i.Parent,
			&i.Description,
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

const findAllNotesByAuthor = `-- name: FindAllNotesByAuthor :many
SELECT creation_date, id, name, parent, description, user_id_fk, title, author_id_fk, number_of_pages, pdf_available FROM elements WHERE type ='note' AND author_id_fk = ? AND user_id_fk = ? ORDER BY title
`

type FindAllNotesByAuthorParams struct {
	AuthorIDFk sql.NullInt32
	UserIDFk   sql.NullString
}

type FindAllNotesByAuthorRow struct {
	CreationDate  sql.NullTime
	ID            int32
	Name          sql.NullString
	Parent        sql.NullInt32
	Description   sql.NullString
	UserIDFk      sql.NullString
	Title         sql.NullString
	AuthorIDFk    sql.NullInt32
	NumberOfPages sql.NullInt32
	PdfAvailable  sql.NullBool
}

func (q *Queries) FindAllNotesByAuthor(ctx context.Context, arg FindAllNotesByAuthorParams) ([]FindAllNotesByAuthorRow, error) {
	rows, err := q.db.QueryContext(ctx, findAllNotesByAuthor, arg.AuthorIDFk, arg.UserIDFk)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []FindAllNotesByAuthorRow
	for rows.Next() {
		var i FindAllNotesByAuthorRow
		if err := rows.Scan(
			&i.CreationDate,
			&i.ID,
			&i.Name,
			&i.Parent,
			&i.Description,
			&i.UserIDFk,
			&i.Title,
			&i.AuthorIDFk,
			&i.NumberOfPages,
			&i.PdfAvailable,
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
SELECT creation_date, id, name, parent, description, user_id_fk, title, author_id_fk, number_of_pages, pdf_available FROM elements WHERE type ='note' AND user_id_fk = ? ORDER BY title
`

type FindAllNotesByCreatorRow struct {
	CreationDate  sql.NullTime
	ID            int32
	Name          sql.NullString
	Parent        sql.NullInt32
	Description   sql.NullString
	UserIDFk      sql.NullString
	Title         sql.NullString
	AuthorIDFk    sql.NullInt32
	NumberOfPages sql.NullInt32
	PdfAvailable  sql.NullBool
}

// type: Note
func (q *Queries) FindAllNotesByCreator(ctx context.Context, userIDFk sql.NullString) ([]FindAllNotesByCreatorRow, error) {
	rows, err := q.db.QueryContext(ctx, findAllNotesByCreator, userIDFk)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []FindAllNotesByCreatorRow
	for rows.Next() {
		var i FindAllNotesByCreatorRow
		if err := rows.Scan(
			&i.CreationDate,
			&i.ID,
			&i.Name,
			&i.Parent,
			&i.Description,
			&i.UserIDFk,
			&i.Title,
			&i.AuthorIDFk,
			&i.NumberOfPages,
			&i.PdfAvailable,
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
SELECT type, id, creation_date, description, name, number_of_pages, title, user_id_fk, parent, author_id_fk, pdf_content, pdf_available FROM elements WHERE parent IS NULL AND user_id_fk = ? ORDER BY title
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
			&i.PdfAvailable,
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
SELECT type, id, creation_date, description, name, number_of_pages, title, user_id_fk, parent, author_id_fk, pdf_content, pdf_available FROM elements WHERE parent = ? ORDER BY title
`

func (q *Queries) FindAllSubElements(ctx context.Context, parent sql.NullInt32) ([]Element, error) {
	rows, err := q.db.QueryContext(ctx, findAllSubElements, parent)
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
			&i.PdfAvailable,
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
	ID       int32
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

const findNoteById = `-- name: FindNoteById :one
SELECT creation_date, id, name, parent, description, user_id_fk, title, author_id_fk, number_of_pages, pdf_available FROM elements WHERE type ='note' AND id = ?
`

type FindNoteByIdRow struct {
	CreationDate  sql.NullTime
	ID            int32
	Name          sql.NullString
	Parent        sql.NullInt32
	Description   sql.NullString
	UserIDFk      sql.NullString
	Title         sql.NullString
	AuthorIDFk    sql.NullInt32
	NumberOfPages sql.NullInt32
	PdfAvailable  sql.NullBool
}

// type: Note
func (q *Queries) FindNoteById(ctx context.Context, id int32) (FindNoteByIdRow, error) {
	row := q.db.QueryRowContext(ctx, findNoteById, id)
	var i FindNoteByIdRow
	err := row.Scan(
		&i.CreationDate,
		&i.ID,
		&i.Name,
		&i.Parent,
		&i.Description,
		&i.UserIDFk,
		&i.Title,
		&i.AuthorIDFk,
		&i.NumberOfPages,
		&i.PdfAvailable,
	)
	return i, err
}

const findUserById = `-- name: FindUserById :one
SELECT user_id, selected_theme, side_bar_collapsed, username FROM user WHERE user_id = ?
`

func (q *Queries) FindUserById(ctx context.Context, userID string) (User, error) {
	row := q.db.QueryRowContext(ctx, findUserById, userID)
	var i User
	err := row.Scan(
		&i.UserID,
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

const updateAuthor = `-- name: UpdateAuthor :exec
UPDATE authors SET name = ?, extra_information = ? WHERE id = ?
`

type UpdateAuthorParams struct {
	Name             sql.NullString
	ExtraInformation sql.NullString
	ID               int32
}

func (q *Queries) UpdateAuthor(ctx context.Context, arg UpdateAuthorParams) error {
	_, err := q.db.ExecContext(ctx, updateAuthor, arg.Name, arg.ExtraInformation, arg.ID)
	return err
}

const updateUser = `-- name: UpdateUser :exec
UPDATE user SET username = ?, selected_theme = ?, side_bar_collapsed = ? WHERE user_id = ?
`

type UpdateUserParams struct {
	Username         sql.NullString
	SelectedTheme    sql.NullString
	SideBarCollapsed bool
	UserID           string
}

func (q *Queries) UpdateUser(ctx context.Context, arg UpdateUserParams) error {
	_, err := q.db.ExecContext(ctx, updateUser,
		arg.Username,
		arg.SelectedTheme,
		arg.SideBarCollapsed,
		arg.UserID,
	)
	return err
}
