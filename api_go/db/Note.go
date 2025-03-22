package db

type Note interface {
	IElement
	GetTitle() string
	GetAuthor() string
	GetNumberOfPages() int
	GetPdfAvailable() bool
}
