package service

import (
	"api_go/db"
	"api_go/models"
	"context"

	"github.com/google/uuid"
)

type PinboardService struct {
	queries *db.Queries
	ctx     context.Context
	members ClubMemberService
	hub     *NotificationHub
}

func NewPinboardService(queries *db.Queries, members ClubMemberService, hub *NotificationHub) PinboardService {
	return PinboardService{
		queries: queries,
		ctx:     context.Background(),
		members: members,
		hub:     hub,
	}
}

func (p *PinboardService) ListForClub(clubID string) ([]models.PinboardPost, error) {
	rows, err := p.queries.ListPinboardPostsForClub(p.ctx, clubID)
	if err != nil {
		return nil, err
	}
	items := make([]models.PinboardPost, 0, len(rows))
	for _, r := range rows {
		items = append(items, models.PinboardPost{
			ID:         r.ID,
			ClubID:     r.ClubID,
			AuthorID:   r.AuthorUserID,
			AuthorName: buildDisplayName(r.AuthorFirstname.String, r.AuthorLastname.String, r.AuthorUsername.String, r.AuthorUserID),
			Title:      r.Title,
			Body:       r.Body,
			Pinned:     r.Pinned,
			CreatedAt:  r.CreatedAt,
			UpdatedAt:  r.UpdatedAt,
		})
	}
	return items, nil
}

func (p *PinboardService) Create(clubID string, authorID string, title string, body string, pinned bool) (models.PinboardPost, error) {
	id := uuid.NewString()
	if err := p.queries.CreatePinboardPost(p.ctx, db.CreatePinboardPostParams{
		ID:           id,
		ClubID:       clubID,
		AuthorUserID: authorID,
		Title:        title,
		Body:         body,
		Pinned:       pinned,
	}); err != nil {
		return models.PinboardPost{}, err
	}
	post, err := p.get(clubID, id)
	if err == nil {
		p.notifyMembers(clubID, id, authorID, title)
	}
	return post, err
}

// notifyMembers pushes a pinboard_post notification to every club member except the author.
func (p *PinboardService) notifyMembers(clubID, postID, authorID, preview string) {
	if p.hub == nil {
		return
	}
	members, err := p.members.GetAllMembersForClub(clubID)
	if err != nil {
		return
	}
	for _, m := range *members {
		if m.User.UserId == authorID {
			continue
		}
		p.hub.Publish(m.User.UserId, NotificationEvent{
			Type: NotifPinboardPost, ClubID: clubID, PostID: postID, Preview: preview,
		})
	}
}

func (p *PinboardService) Update(clubID string, id string, title string, body string, pinned bool) (models.PinboardPost, error) {
	if err := p.queries.UpdatePinboardPost(p.ctx, db.UpdatePinboardPostParams{
		Title:  title,
		Body:   body,
		Pinned: pinned,
		ID:     id,
		ClubID: clubID,
	}); err != nil {
		return models.PinboardPost{}, err
	}
	return p.get(clubID, id)
}

func (p *PinboardService) Delete(clubID string, id string) error {
	return p.queries.DeletePinboardPost(p.ctx, db.DeletePinboardPostParams{
		ID:     id,
		ClubID: clubID,
	})
}

func (p *PinboardService) RecentForUser(userID string, limit int32) ([]models.PinboardPost, error) {
	rows, err := p.queries.ListRecentPinboardPostsForUser(p.ctx, db.ListRecentPinboardPostsForUserParams{
		UserID: userID,
		Limit:  limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]models.PinboardPost, 0, len(rows))
	for _, r := range rows {
		items = append(items, models.PinboardPost{
			ID:         r.ID,
			ClubID:     r.ClubID,
			ClubName:   r.ClubName,
			AuthorID:   r.AuthorUserID,
			AuthorName: buildDisplayName(r.AuthorFirstname.String, r.AuthorLastname.String, r.AuthorUsername.String, r.AuthorUserID),
			Title:      r.Title,
			Body:       r.Body,
			Pinned:     r.Pinned,
			CreatedAt:  r.CreatedAt,
			UpdatedAt:  r.UpdatedAt,
		})
	}
	return items, nil
}

func (p *PinboardService) get(clubID string, id string) (models.PinboardPost, error) {
	r, err := p.queries.GetPinboardPost(p.ctx, db.GetPinboardPostParams{
		ID:     id,
		ClubID: clubID,
	})
	if err != nil {
		return models.PinboardPost{}, err
	}
	return models.PinboardPost{
		ID:         r.ID,
		ClubID:     r.ClubID,
		AuthorID:   r.AuthorUserID,
		AuthorName: buildDisplayName(r.AuthorFirstname.String, r.AuthorLastname.String, r.AuthorUsername.String, r.AuthorUserID),
		Title:      r.Title,
		Body:       r.Body,
		Pinned:     r.Pinned,
		CreatedAt:  r.CreatedAt,
		UpdatedAt:  r.UpdatedAt,
	}, nil
}
