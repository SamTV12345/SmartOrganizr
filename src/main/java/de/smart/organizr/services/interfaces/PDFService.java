package de.smart.organizr.services.interfaces;

import com.itextpdf.text.DocumentException;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import org.primefaces.model.file.UploadedFile;

import java.io.IOException;
import java.io.InputStream;

public interface PDFService {
	void writePDF(UploadedFile uploadedFile, Note note) throws IOException;

	String getPathMediaFolderOfPDF(int id);

	String getPathQRCodeOfPDF(int id);

	boolean checkIfPDFForNoteIsAvailable(int id);

	InputStream loadPDFFromDisk(int id) throws IOException;

	void generateQrCodeForEveryNote(Folder folder) throws DocumentException, IOException;
}
