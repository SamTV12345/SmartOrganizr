package dto

type ClubFileDto struct {
	ID           string `json:"id"`
	ClubID       string `json:"clubId"`
	Name         string `json:"name"`
	MimeType     string `json:"mimeType"`
	SizeBytes    int64  `json:"sizeBytes"`
	UploadedById string `json:"uploadedById"`
	UploadedBy   string `json:"uploadedBy"`
	CreatedAt    string `json:"createdAt"`
}
