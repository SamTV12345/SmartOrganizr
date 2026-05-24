package db

import (
	"context"
	"database/sql"
)

// Hand-written queries for the Wikidata autocomplete feature. They live here
// rather than in query.sql.go because sqlc cannot regenerate this project's
// generated file (older migrations contain constructs the parser rejects).

const findAuthorByUserAndWikidataId = `-- name: FindAuthorByUserAndWikidataId :one
SELECT id, extra_information, name, user_id_fk, wikidata_id, birth_year, death_year
FROM authors WHERE user_id_fk = ? AND wikidata_id = ?
`

type FindAuthorByUserAndWikidataIdParams struct {
	UserIDFk   sql.NullString
	WikidataID sql.NullString
}

func (q *Queries) FindAuthorByUserAndWikidataId(ctx context.Context, arg FindAuthorByUserAndWikidataIdParams) (Author, error) {
	row := q.db.QueryRowContext(ctx, findAuthorByUserAndWikidataId, arg.UserIDFk, arg.WikidataID)
	var i Author
	err := row.Scan(
		&i.ID,
		&i.ExtraInformation,
		&i.Name,
		&i.UserIDFk,
		&i.WikidataID,
		&i.BirthYear,
		&i.DeathYear,
	)
	return i, err
}

const findAuthorsByUserAndExactName = `-- name: FindAuthorsByUserAndExactName :many
SELECT id, extra_information, name, user_id_fk, wikidata_id, birth_year, death_year
FROM authors WHERE user_id_fk = ? AND name = ?
`

type FindAuthorsByUserAndExactNameParams struct {
	UserIDFk sql.NullString
	Name     sql.NullString
}

func (q *Queries) FindAuthorsByUserAndExactName(ctx context.Context, arg FindAuthorsByUserAndExactNameParams) ([]Author, error) {
	rows, err := q.db.QueryContext(ctx, findAuthorsByUserAndExactName, arg.UserIDFk, arg.Name)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Author, 0)
	for rows.Next() {
		var i Author
		if err := rows.Scan(
			&i.ID,
			&i.ExtraInformation,
			&i.Name,
			&i.UserIDFk,
			&i.WikidataID,
			&i.BirthYear,
			&i.DeathYear,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const findAuthorsByUserAndNameLike = `-- name: FindAuthorsByUserAndNameLike :many
SELECT id, extra_information, name, user_id_fk, wikidata_id, birth_year, death_year
FROM authors
WHERE user_id_fk = ? AND name LIKE CONCAT('%', ?, '%')
ORDER BY name LIMIT 10
`

type FindAuthorsByUserAndNameLikeParams struct {
	UserIDFk sql.NullString
	Term     string
}

func (q *Queries) FindAuthorsByUserAndNameLike(ctx context.Context, arg FindAuthorsByUserAndNameLikeParams) ([]Author, error) {
	rows, err := q.db.QueryContext(ctx, findAuthorsByUserAndNameLike, arg.UserIDFk, arg.Term)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Author, 0)
	for rows.Next() {
		var i Author
		if err := rows.Scan(
			&i.ID,
			&i.ExtraInformation,
			&i.Name,
			&i.UserIDFk,
			&i.WikidataID,
			&i.BirthYear,
			&i.DeathYear,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const findElementsByUserAndNameLike = `-- name: FindElementsByUserAndNameLike :many
SELECT type, id, creation_date, description, name, number_of_pages, user_id_fk, parent, composer_id_fk, arranger_id_fk, pdf_content, wikidata_id, composition_year, genre
FROM elements
WHERE user_id_fk = ? AND type = 'note' AND name LIKE CONCAT('%', ?, '%')
ORDER BY name LIMIT 10
`

type FindElementsByUserAndNameLikeParams struct {
	UserIDFk sql.NullString
	Term     string
}

func (q *Queries) FindElementsByUserAndNameLike(ctx context.Context, arg FindElementsByUserAndNameLikeParams) ([]Element, error) {
	rows, err := q.db.QueryContext(ctx, findElementsByUserAndNameLike, arg.UserIDFk, arg.Term)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Element, 0)
	for rows.Next() {
		var i Element
		if err := rows.Scan(
			&i.Type,
			&i.ID,
			&i.CreationDate,
			&i.Description,
			&i.Name,
			&i.NumberOfPages,
			&i.UserIDFk,
			&i.Parent,
			&i.ComposerIDFk,
			&i.ArrangerIDFk,
			&i.PdfContent,
			&i.WikidataID,
			&i.CompositionYear,
			&i.Genre,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const createNoteWithWikidata = `-- name: CreateNoteWithWikidata :execlastid
INSERT INTO elements (
  type, id, creation_date, description, name, number_of_pages,
  user_id_fk, parent, composer_id_fk, arranger_id_fk,
  wikidata_id, composition_year, genre
) VALUES (
  'note', ?, NOW(), ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?
)
`

type CreateNoteWithWikidataParams struct {
	ID              string
	Description     sql.NullString
	Name            sql.NullString
	NumberOfPages   sql.NullInt32
	UserIDFk        sql.NullString
	Parent          sql.NullString
	ComposerIDFk    sql.NullString
	ArrangerIDFk    sql.NullString
	WikidataID      sql.NullString
	CompositionYear sql.NullInt16
	Genre           sql.NullString
}

func (q *Queries) CreateNoteWithWikidata(ctx context.Context, arg CreateNoteWithWikidataParams) (int64, error) {
	result, err := q.db.ExecContext(ctx, createNoteWithWikidata,
		arg.ID,
		arg.Description,
		arg.Name,
		arg.NumberOfPages,
		arg.UserIDFk,
		arg.Parent,
		arg.ComposerIDFk,
		arg.ArrangerIDFk,
		arg.WikidataID,
		arg.CompositionYear,
		arg.Genre,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}
