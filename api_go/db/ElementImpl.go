package db

import "time"

func (e Element) GetCreationDate() time.Time {
	return e.CreationDate.Time
}

func (e Element) GetId() int32 {
	return e.ID
}

func (e Element) GetName() string {
	return e.Name.String
}

func (e Element) GetParent() int32 {
	return e.Parent.Int32
}

func (e Element) GetDescription() string {
	return e.Description.String
}

func (e Element) GetCreator() string {
	return e.UserIDFk.String
}

func (e Element) GetType() string {
	return e.Type
}
