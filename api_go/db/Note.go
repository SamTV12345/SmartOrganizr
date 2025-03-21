package db

type Note interface {
	IElement
	GetTitle() string
	GetAuthor() int32
	GetNumberOfPages() int
	GetPdfAvailable() bool
}
