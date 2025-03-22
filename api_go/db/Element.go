package db

import "time"

type IElement interface {
	GetCreationDate() time.Time
	GetId() string
	GetName() string
	GetParent() string
	GetDescription() string
	GetCreator() string
	GetType() string
}
