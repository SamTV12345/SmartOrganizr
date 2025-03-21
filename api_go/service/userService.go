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
		SideBarCollapsed: user.SideBarCollapsed.(bool),
		SelectedTheme:    user.SelectedTheme.String,
		Username:         user.Username.String,
		UserId:           user.UserID,
	}, nil
}

func (u *UserService) saveUser(user *models.User) error {
	_, err := u.Queries.CreateUser(u.Ctx, db.CreateUserParams{
		UserID: user.UserId,
		Username: sql.NullString{
			String: user.Username,
		},
		SelectedTheme: sql.NullString{
			String: user.SelectedTheme,
		},
		SideBarCollapsed: user.SideBarCollapsed,
	})
	return err
}
