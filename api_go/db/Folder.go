package db

import (
	"database/sql"
	"time"
)

type Folder struct {
	CreationDate sql.NullTime
	ID           string
	Name         sql.NullString
	Parent       sql.NullString
	Description  sql.NullString
	UserIDFk     sql.NullString
}

func (f Folder) GetCreationDate() time.Time {
	return f.CreationDate.Time
}

func (f Folder) GetId() string {
	return f.ID
}

func (f Folder) GetName() string {
	return f.Name.String
}

func (f Folder) GetParent() string {
	return f.Parent.String
}

func (f Folder) GetDescription() string {
	return f.Description.String
}

func (f Folder) GetCreator() string {
	return f.GetCreator()
}

func (f Folder) GetType() string {
	return "FOLDER"
}

var _ IElement = &Folder{}
