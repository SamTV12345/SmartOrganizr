package service

import "database/sql"

func NewSQLNullString(value string) sql.NullString {
	return sql.NullString{
		String: value,
		Valid:  true,
	}
}

func NewSQLNullInt(value int) sql.NullInt32 {
	return sql.NullInt32{
		Int32: int32(value),
		Valid: true,
	}
}
