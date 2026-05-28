package service

import (
	"api_go/db"
	"api_go/models"
	"context"

	"github.com/google/uuid"
)

type ClubFileService struct {
	queries *db.Queries
	ctx     context.Context
}

func NewClubFileService(queries *db.Queries) ClubFileService {
	return ClubFileService{
		queries: queries,
		ctx:     context.Background(),
	}
}

func (s *ClubFileService) ListForClub(clubID string) ([]models.ClubFile, error) {
	rows, err := s.queries.ListClubFilesForClub(s.ctx, clubID)
	if err != nil {
		return nil, err
	}
	items := make([]models.ClubFile, 0, len(rows))
	for _, r := range rows {
		items = append(items, models.ClubFile{
			ID:         r.ID,
			ClubID:     r.ClubID,
			Name:       r.Name,
			MimeType:   r.MimeType,
			SizeBytes:  r.SizeBytes,
			UploaderID: r.UploadedByUserID,
			UploadedBy: buildDisplayName(r.UploaderFirstname.String, r.UploaderLastname.String, r.UploaderUsername.String, r.UploadedByUserID),
			CreatedAt:  r.CreatedAt,
		})
	}
	return items, nil
}

func (s *ClubFileService) Create(clubID string, name string, mimeType string, content []byte, uploaderID string) (models.ClubFile, error) {
	id := uuid.NewString()
	size := int64(len(content))
	if err := s.queries.CreateClubFile(s.ctx, db.CreateClubFileParams{
		ID:               id,
		ClubID:           clubID,
		Name:             name,
		MimeType:         mimeType,
		SizeBytes:        size,
		Content:          content,
		UploadedByUserID: uploaderID,
	}); err != nil {
		return models.ClubFile{}, err
	}
	return models.ClubFile{
		ID:         id,
		ClubID:     clubID,
		Name:       name,
		MimeType:   mimeType,
		SizeBytes:  size,
		UploaderID: uploaderID,
	}, nil
}

func (s *ClubFileService) GetContent(clubID string, id string) (models.ClubFileContent, error) {
	r, err := s.queries.GetClubFileContent(s.ctx, db.GetClubFileContentParams{
		ID:     id,
		ClubID: clubID,
	})
	if err != nil {
		return models.ClubFileContent{}, err
	}
	return models.ClubFileContent{
		Name:     r.Name,
		MimeType: r.MimeType,
		Content:  r.Content,
	}, nil
}

func (s *ClubFileService) Delete(clubID string, id string) error {
	return s.queries.DeleteClubFile(s.ctx, db.DeleteClubFileParams{
		ID:     id,
		ClubID: clubID,
	})
}
