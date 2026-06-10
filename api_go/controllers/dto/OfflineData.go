package dto

// OfflineDataResponse is the bulk payload consumed by the PWA for offline use.
// It carries only metadata DTOs — never PDF bytes.
type OfflineDataResponse struct {
	Authors []Author `json:"authors"`
	Folders []Folder `json:"folders"`
	Notes   []Note   `json:"notes"`
}
