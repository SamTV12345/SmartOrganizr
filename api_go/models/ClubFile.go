package models

import "time"

type ClubFile struct {
	ID         string
	ClubID     string
	Name       string
	MimeType   string
	SizeBytes  int64
	UploaderID string
	UploadedBy string
	CreatedAt  time.Time
}

type ClubFileContent struct {
	Name     string
	MimeType string
	Content  []byte
}
