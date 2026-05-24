package service

import (
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
	"database/sql"
	"errors"
)

// ResolveStatus encodes the outcome of attempting to link an incoming
// Wikidata author to a user's existing author records.
type ResolveStatus int

const (
	// ResolveStatusMatched: an existing local author already has this QID.
	ResolveStatusMatched ResolveStatus = iota
	// ResolveStatusCreated: no match — new author was persisted with the QID.
	ResolveStatusCreated
	// ResolveStatusConflict: no QID match but at least one local author
	// shares the same name without a QID. Frontend must ask the user whether
	// to link the existing record or create a new one alongside it.
	ResolveStatusConflict
)

type ResolveResult struct {
	Status     ResolveStatus
	Author     models.Author
	Candidates []models.Author // populated when Status == Conflict
}

// AuthorResolver is the side-effecting surface ResolveAuthor needs. Defining
// it as an interface keeps the resolution logic unit-testable without spinning
// up a MySQL instance — the production adapter (sqlcAuthorResolver) lives at
// the bottom of this file.
type AuthorResolver interface {
	FindByWikidataID(userID, qid string) (*models.Author, error)
	FindByExactName(userID, name string) ([]models.Author, error)
	Create(userID string, a models.Author) (models.Author, error)
}

// ResolveAuthor decides what to do with an incoming Wikidata-sourced author:
//  1. If a local author already has this QID, return it (Matched).
//  2. Else if the name collides with an existing local author that has no QID,
//     surface the conflict so the user can choose link-or-create-new (Conflict).
//  3. Otherwise insert a fresh author with the Wikidata fields (Created).
func ResolveAuthor(r AuthorResolver, userID string, w WikidataAuthor) (*ResolveResult, error) {
	if w.WikidataID != "" {
		existing, err := r.FindByWikidataID(userID, w.WikidataID)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return &ResolveResult{Status: ResolveStatusMatched, Author: *existing}, nil
		}
	}
	if w.Name != "" {
		matches, err := r.FindByExactName(userID, w.Name)
		if err != nil {
			return nil, err
		}
		conflicts := make([]models.Author, 0, len(matches))
		for _, m := range matches {
			if m.WikidataID == "" {
				conflicts = append(conflicts, m)
			}
		}
		if len(conflicts) > 0 {
			return &ResolveResult{Status: ResolveStatusConflict, Candidates: conflicts}, nil
		}
	}
	created, err := r.Create(userID, models.Author{
		Name:       w.Name,
		WikidataID: w.WikidataID,
		BirthYear:  w.BirthYear,
		DeathYear:  w.DeathYear,
	})
	if err != nil {
		return nil, err
	}
	return &ResolveResult{Status: ResolveStatusCreated, Author: created}, nil
}

// sqlcAuthorResolver bridges ResolveAuthor's interface to the real DB layer.
type sqlcAuthorResolver struct {
	queries *db.Queries
	ctx     context.Context
	svc     *AuthorService
}

func NewSqlcAuthorResolver(svc *AuthorService) AuthorResolver {
	return &sqlcAuthorResolver{queries: svc.Queries, ctx: svc.Ctx, svc: svc}
}

func (s *sqlcAuthorResolver) FindByWikidataID(userID, qid string) (*models.Author, error) {
	row, err := s.queries.FindAuthorByUserAndWikidataId(s.ctx, db.FindAuthorByUserAndWikidataIdParams{
		UserIDFk:   db.NewSQLNullString(userID),
		WikidataID: db.NewSQLNullString(qid),
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	a := mappers.ConvertAuthorFromEntity(row)
	return &a, nil
}

func (s *sqlcAuthorResolver) FindByExactName(userID, name string) ([]models.Author, error) {
	rows, err := s.queries.FindAuthorsByUserAndExactName(s.ctx, db.FindAuthorsByUserAndExactNameParams{
		UserIDFk: db.NewSQLNullString(userID),
		Name:     db.NewSQLNullString(name),
	})
	if err != nil {
		return nil, err
	}
	out := make([]models.Author, 0, len(rows))
	for _, r := range rows {
		out = append(out, mappers.ConvertAuthorFromEntity(r))
	}
	return out, nil
}

func (s *sqlcAuthorResolver) Create(userID string, a models.Author) (models.Author, error) {
	return s.svc.CreateAuthor(dto.AuthorCreateDto{
		Name:             a.Name,
		ExtraInformation: a.ExtraInformation,
		WikidataID:       a.WikidataID,
		BirthYear:        a.BirthYear,
		DeathYear:        a.DeathYear,
	}, userID)
}
