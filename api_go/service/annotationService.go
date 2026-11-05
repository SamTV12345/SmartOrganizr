package service

import (
	"api_go/controllers/dto"
	"api_go/db"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

const (
	maxAnnotationBytes     = 512 * 1024
	maxAnnotationPages     = 10000
	maxAnnotationRowsUser  = 20000
	maxAnnotationKeyLength = 255
)

var (
	ErrAnnotationKey      = errors.New("invalid pdf key")
	ErrAnnotationPage     = errors.New("invalid page")
	ErrAnnotationData     = errors.New("annotation data must be a JSON object")
	ErrAnnotationTooLarge = errors.New("annotation data too large")
	ErrAnnotationQuota    = errors.New("too many annotated pages")
)

// AnnotationService stores each player's private annotations per PDF page.
// Rows are scoped to the user, so no access check on the PDF itself is needed:
// nobody can read or change someone else's annotations.
type AnnotationService struct {
	queries *db.Queries
	ctx     context.Context
}

func NewAnnotationService(queries *db.Queries) AnnotationService {
	return AnnotationService{queries: queries, ctx: context.Background()}
}

func validAnnotationKey(key string) bool {
	return key != "" && len(key) <= maxAnnotationKeyLength && !strings.ContainsAny(key, " \t\r\n")
}

// IsEmptyAnnotation reports whether a page document carries nothing worth
// storing: every top-level value is null or an empty array/object.
func IsEmptyAnnotation(doc map[string]json.RawMessage) bool {
	for _, v := range doc {
		switch strings.TrimSpace(string(v)) {
		case "null", "[]", "{}", "":
			continue
		default:
			return false
		}
	}
	return true
}

func (s *AnnotationService) List(userID, key string) (dto.SheetAnnotationsDto, error) {
	if !validAnnotationKey(key) {
		return dto.SheetAnnotationsDto{}, ErrAnnotationKey
	}
	rows, err := s.queries.ListSheetAnnotations(s.ctx, db.ListSheetAnnotationsParams{UserID: userID, PdfKey: key})
	if err != nil {
		return dto.SheetAnnotationsDto{}, err
	}
	pages := make([]dto.SheetAnnotationPageDto, 0, len(rows))
	for _, r := range rows {
		pages = append(pages, dto.SheetAnnotationPageDto{Page: int(r.Page), Data: r.Data, UpdatedAt: r.UpdatedAt.Format(time.RFC3339)})
	}
	return dto.SheetAnnotationsDto{Key: key, Pages: pages}, nil
}

// SavePage replaces one page's annotations; an empty document removes the row.
func (s *AnnotationService) SavePage(userID string, in dto.SheetAnnotationPutDto) error {
	if !validAnnotationKey(in.Key) {
		return ErrAnnotationKey
	}
	if in.Page < 1 || in.Page > maxAnnotationPages {
		return ErrAnnotationPage
	}
	if len(in.Data) > maxAnnotationBytes {
		return ErrAnnotationTooLarge
	}
	var doc map[string]json.RawMessage
	if err := json.Unmarshal([]byte(in.Data), &doc); err != nil || doc == nil {
		return ErrAnnotationData
	}
	if IsEmptyAnnotation(doc) {
		return s.queries.DeleteSheetAnnotation(s.ctx, db.DeleteSheetAnnotationParams{UserID: userID, PdfKey: in.Key, Page: int32(in.Page)})
	}
	count, err := s.queries.CountSheetAnnotationsForUser(s.ctx, userID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	if count >= maxAnnotationRowsUser {
		// Updating an existing page is still fine; only new pages hit the quota.
		existing, err := s.queries.ListSheetAnnotations(s.ctx, db.ListSheetAnnotationsParams{UserID: userID, PdfKey: in.Key})
		if err != nil {
			return err
		}
		found := false
		for _, r := range existing {
			if int(r.Page) == in.Page {
				found = true
				break
			}
		}
		if !found {
			return ErrAnnotationQuota
		}
	}
	return s.queries.UpsertSheetAnnotation(s.ctx, db.UpsertSheetAnnotationParams{UserID: userID, PdfKey: in.Key, Page: int32(in.Page), Data: in.Data})
}
