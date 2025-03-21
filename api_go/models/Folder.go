package models

import "time"

type Folder struct {
	CreationDate time.Time `json:"creationDate"`
	Id           int32     `json:"id"`
	Name         string    `json:"name"`
	Parent       *Folder   `json:"parent"`
	Description  string    `json:"description"`
	Creator      User      `json:"creator"`
	Elements     []Element `json:"elements"`
}
