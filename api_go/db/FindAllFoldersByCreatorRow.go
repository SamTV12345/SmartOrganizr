package db

import "time"

func (folder FindAllFoldersByCreatorRow) GetCreationDate() time.Time {
	return folder.GetCreationDate()
}

func (folder FindAllFoldersByCreatorRow) GetId() string {
	return folder.GetId()
}

func (folder FindAllFoldersByCreatorRow) GetName() string {
	return folder.GetName()
}

func (folder FindAllFoldersByCreatorRow) GetParent() string {
	return folder.GetParent()
}

func (folder FindAllFoldersByCreatorRow) GetDescription() string {
	return folder.GetDescription()
}

func (folder FindAllFoldersByCreatorRow) GetCreator() string {
	return folder.GetCreator()
}

func (folder FindAllFoldersByCreatorRow) GetType() string {
	return "FOLDER"
}
