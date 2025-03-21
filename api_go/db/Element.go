package db

import "time"

type IElement interface {
	GetCreationDate() time.Time
	GetId() int32
	GetName() string
	GetParent() int32
	GetDescription() string
	GetCreator() string
	GetType() string
}
