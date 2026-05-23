package dto

import "time"

type Folder struct {
	CreationDate time.Time `json:"creationDate" validate:"required"`
	Id           string    `json:"id"           validate:"required"`
	Name         string    `json:"name"         validate:"required"`
	Parent       *Folder   `json:"parent"`
	Description  string    `json:"description"  validate:"required"`
	Creator      User      `json:"creator"      validate:"required"`
	Type         string    `json:"type"         validate:"required" enums:"folder"`
}
