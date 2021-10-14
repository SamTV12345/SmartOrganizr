package de.smart.organizr.services.interfaces;

import com.itextpdf.text.DocumentException;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import org.primefaces.model.file.UploadedFile;

import java.io.IOException;
import java.io.InputStream;

public interface PDFService {
	/**
	 * Writes the note as pdf
	 * @param uploadedFile the uploaded file
	 * @param note  the note
	 * @throws IOException if an error when saving the file occurs
	 */
	void writePDF(UploadedFile uploadedFile, Note note) throws IOException;

	/**
	 * Gets the path media folder of pdf by note id
	 * @param id the note id
	 * @return a string of the path
	 */
	String getPathMediaFolderOfPDF(int id);

	/**
	 * Gets the path of the qrcodegen for a folder
	 * @param id the id
	 * @return a string of the path
	 */
	String getPathQRCodeOfPDF(int id);

	/**
	 * Checks if a pdf for the note is available
	 * @param id the id
	 * @return a boolean if a pdf is available
	 */
	boolean checkIfPDFForNoteIsAvailable(int id);

	/**
	 * Loads a pdf from disk
	 * @param id the id
	 * @return an inputstream of the pdf
	 * @throws IOException if an error occurs when opening the file
	 */
	InputStream loadPDFFromDisk(int id) throws IOException;

	/**
	 * Generates a qr code for every note
	 * @param folder the folder
	 * @throws DocumentException if during document creation error occurs
	 * @throws IOException if during saving error occurs
	 */
	void generateQrCodeForEveryNote(Folder folder) throws DocumentException, IOException;
}
