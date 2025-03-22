package db

import "time"

func (f FindFolderByIdRow) GetCreationDate() time.Time {
	return f.CreationDate.Time
}

func (f FindFolderByIdRow) GetId() string {
	return f.ID
}

func (f FindFolderByIdRow) GetName() string {
	return f.Name.String
}

func (f FindFolderByIdRow) GetParent() string {
	return f.Parent.String
}

func (f FindFolderByIdRow) GetDescription() string {
	return f.Description.String
}

func (f FindFolderByIdRow) GetCreator() string {
	return f.UserIDFk.String
}

func (f FindFolderByIdRow) GetType() string {
	return "FOLDER"
}
