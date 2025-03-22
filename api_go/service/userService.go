package service

import (
	"api_go/db"
	"api_go/models"
	"context"
	"database/sql"
)

type UserService struct {
	Queries *db.Queries
	Ctx     context.Context
}

func (u *UserService) LoadUser(userId string) (*models.User, error) {
	user, err := u.Queries.FindUserById(u.Ctx, userId)
	if err != nil {
		return nil, err
	}
	return &models.User{
		SideBarCollapsed: user.SideBarCollapsed,
		SelectedTheme:    user.SelectedTheme.String,
		Username:         user.Username.String,
		UserId:           user.UserID,
	}, nil
}

func (u *UserService) SaveUser(user *models.User) error {
	_, err := u.Queries.CreateUser(u.Ctx, db.CreateUserParams{
		UserID: user.UserId,
		Username: sql.NullString{
			String: user.Username,
			Valid:  true,
		},
		SelectedTheme: sql.NullString{
			String: user.SelectedTheme,
			Valid:  true,
		},
		SideBarCollapsed: user.SideBarCollapsed,
	})
	return err
}

func (u *UserService) UpdateUser(user *models.User) error {
	err := u.Queries.UpdateUser(u.Ctx, db.UpdateUserParams{
		UserID: user.UserId,
		Username: sql.NullString{
			String: user.Username,
			Valid:  true,
		},
		SelectedTheme: sql.NullString{
			String: user.SelectedTheme,
			Valid:  true,
		},
		SideBarCollapsed: user.SideBarCollapsed,
	})
	return err
}
