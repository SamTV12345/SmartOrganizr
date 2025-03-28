package service

import (
	"api_go/models"
	"bufio"
	"bytes"
	"codeberg.org/go-pdf/fpdf"
	"github.com/yeqown/go-qrcode/v2"
	"github.com/yeqown/go-qrcode/writer/standard"
)

func GeneratePDFForFolder(folderId string, folderservice FolderService, userId string, userservice UserService) ([]byte, error) {
	folderToExport, err := folderservice.FindFolderByIdAndUser(folderId, userId)
	if err != nil {
		return nil, err
	}
	var user, errWhenLoading = userservice.LoadUser(userId)
	if errWhenLoading != nil {
		return nil, errWhenLoading
	}
	folderservice.loadSubElements(folderToExport, *user)
	type DataPDFHolder struct {
		filename string
		Note     models.Note
	}
	var notesToEmbed = make([]DataPDFHolder, 0)

	for _, note := range folderToExport.Elements {
		if note.Type() == models.NOTE {
			var convertedNote = note.(models.Note)
			convertedNote.Parent = folderToExport
			qrc, err := qrcode.New(convertedNote.String())
			if err != nil {
				return nil, err
			}
			var filename = "./" + convertedNote.Id + ".png"
			w, err := standard.New(filename)
			err = qrc.Save(w)
			notesToEmbed = append(notesToEmbed, DataPDFHolder{
				Note:     convertedNote,
				filename: filename,
			})
		}
	}

	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)
	for _, note := range notesToEmbed {
		pdf.Cell(40, 10, note.Note.Name)
		pdf.Image(note.filename, 10, 10, 30, 30, false, "", 0, "")
	}
	var b bytes.Buffer
	writer := bufio.NewWriter(&b)
	err = pdf.Output(writer)
	if err != nil {
		return nil, err
	}
	err = writer.Flush()
	if err != nil {
		return nil, err
	}
	return b.Bytes(), err
}
