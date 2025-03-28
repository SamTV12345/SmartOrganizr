package models

import "time"

type Folder struct {
	CreationDate time.Time `json:"creationDate"`
	Id           string    `json:"id"`
	Name         string    `json:"name"`
	Parent       *Folder   `json:"parent"`
	Description  string    `json:"description"`
	Creator      User      `json:"creator"`
	Elements     []Element `json:"elements"`
}

func (folder Folder) String() string {
	return "\nName:\t" +
		folder.Name +
		"\n" + "Beschreibung:\t" +
		folder.Description +
		"\n" + "Erstellungsdatum:\t" +
		folder.CreationDate.String()
}

func (folder Folder) Type() ElementName {
	return FOLDER
}

var _ Element = Folder{}
