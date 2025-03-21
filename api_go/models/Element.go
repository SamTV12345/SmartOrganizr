package models

type ElementName string

const (
	FOLDER ElementName = "FOLDER"
	NOTE   ElementName = "NOTE"
)

type Element interface {
	GetType() ElementName
}

func (n Note) GetType() ElementName {
	return NOTE
}

func (f Folder) GetType() ElementName {
	return FOLDER
}
