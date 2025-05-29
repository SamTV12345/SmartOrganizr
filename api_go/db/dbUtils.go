package db

import (
	"database/sql"
	"time"
)

func NewSQLNullString(value string) sql.NullString {
	return sql.NullString{
		String: value,
		Valid:  true,
	}
}

func NewSQLNullStringNullValue(value *string) sql.NullString {
	if value == nil {
		return sql.NullString{
			Valid: false,
		}
	}
	return sql.NullString{
		String: *value,
		Valid:  true,
	}
}

func ConvertSQLNullFloatToFloat(value sql.NullFloat64) *float64 {
	if !value.Valid {
		return nil
	}
	return &value.Float64
}

func ConvertSQLNullString(value sql.NullString) *string {
	if !value.Valid {
		return nil
	}
	return &value.String
}

func ConvertSQLNullTime(value sql.NullTime) *time.Time {
	if !value.Valid {
		return nil
	}
	return &value.Time
}

func NewSQLNullInt(value int) sql.NullInt32 {
	return sql.NullInt32{
		Int32: int32(value),
		Valid: true,
	}
}

func NewSQLNullTime(value time.Time) sql.NullTime {
	return sql.NullTime{
		Valid: true,
		Time:  value,
	}
}

func NewSQLNullFloatNullable(value *float64) sql.NullFloat64 {
	if value == nil {
		return sql.NullFloat64{
			Valid: false,
		}
	}
	return sql.NullFloat64{
		Float64: *value,
		Valid:   true,
	}
}
