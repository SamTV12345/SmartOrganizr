package service

import (
	"api_go/db"
	"api_go/mappers"
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
	var userModel = mappers.ConvertUserFromEntity(user)
	return &userModel, nil
}

func (u *UserService) SaveUser(user *models.User) error {
	_, err := u.Queries.CreateUser(u.Ctx, db.CreateUserParams{
		ID:               user.UserId,
		Username:         db.NewSQLNullString(user.Username),
		Firstname:        db.NewSQLNullString(user.Firstname),
		Lastname:         db.NewSQLNullString(user.Lastname),
		SideBarCollapsed: user.SideBarCollapsed,
	})
	return err
}

func (u *UserService) UpdateSyncFromKeycloakUser(user *models.User) error {
	var loadedUser, err = u.LoadUser(user.UserId)
	if err != nil {
		return err
	}
	err = u.Queries.UpdateUser(u.Ctx, db.UpdateUserParams{
		ID: user.UserId,
		Username: sql.NullString{
			String: user.Username,
			Valid:  true,
		},
		Firstname:        db.NewSQLNullString(user.Firstname),
		Lastname:         db.NewSQLNullString(user.Lastname),
		Email:            db.NewSQLNullString(user.Email),
		Telephonenumber:  db.NewSQLNullString(loadedUser.TelephoneNumber),
		SideBarCollapsed: user.SideBarCollapsed,
	})
	return err
}

func (u *UserService) UpdateFromEndpoint(user *models.User) error {
	err := u.Queries.UpdateUser(u.Ctx, db.UpdateUserParams{
		ID:               user.UserId,
		Username:         db.NewSQLNullString(user.Username),
		Firstname:        db.NewSQLNullString(user.Firstname),
		Lastname:         db.NewSQLNullString(user.Lastname),
		Email:            db.NewSQLNullString(user.Email),
		Telephonenumber:  db.NewSQLNullString(user.TelephoneNumber),
		SideBarCollapsed: user.SideBarCollapsed,
	})
	return err
}

func (u *UserService) UpdateProfilePicture(userId string, profilePic []byte) error {
	err := u.Queries.UpdateUserProfilePicture(u.Ctx, db.UpdateUserProfilePictureParams{
		ID:             userId,
		ProfilePicture: db.NewSQLNullString(string(profilePic)),
	})
	return err
}

func (u *UserService) DeleteProfilePicture(userId string) error {
	err := u.Queries.DeleteProfilePicture(u.Ctx, userId)
	return err
}
