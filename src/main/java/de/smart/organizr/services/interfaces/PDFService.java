package de.smart.organizr.services.interfaces;

import de.smart.organizr.entities.interfaces.Note;
import org.primefaces.model.file.UploadedFile;

import java.io.IOException;
import java.io.InputStream;

public interface PDFService {
	void writePDF(UploadedFile uploadedFile, Note note) throws IOException;

	String getPathOfPDF(int id);

	boolean checkIfPDFForNoteIsAvailable(int id);

	InputStream loadPDFFromDisk(int id) throws IOException;
}
