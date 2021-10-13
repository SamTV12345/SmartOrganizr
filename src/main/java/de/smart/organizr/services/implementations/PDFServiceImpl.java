package de.smart.organizr.services.implementations;

import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.services.interfaces.PDFService;
import org.primefaces.model.file.UploadedFile;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public class PDFServiceImpl implements PDFService {
	private static final String PATH_TO_MEDIA_FOLDER = "media/";

	@Override
	public void writePDF(final UploadedFile uploadedFile, final Note note) throws IOException {
		final File mediaFolder = new File(PATH_TO_MEDIA_FOLDER);
		if(!mediaFolder.exists()){
			mediaFolder.mkdir();
		}
		final InputStream inputStream = uploadedFile.getInputStream();
		final OutputStream outputStream;

		final File file = new File(PATH_TO_MEDIA_FOLDER + note.getId()+".pdf");

		outputStream = new FileOutputStream(file);

		int read = 0;
		final byte[] bytes = uploadedFile.getContent();

		while ((read = inputStream.read(bytes)) != -1) {
			outputStream.write(bytes, 0, read);
		}
	}

	@Override
	public String getPathOfPDF(final int id){
		return PATH_TO_MEDIA_FOLDER+id+".pdf";
	}

	@Override
	public boolean checkIfPDFForNoteIsAvailable(final int id){
		return new File(getPathOfPDF(id)).exists();
	}

	@Override
	public InputStream loadPDFFromDisk(final int id) {
		if(checkIfPDFForNoteIsAvailable(id)){
			return getClass().getResourceAsStream(getPathOfPDF(id));

		}
		else{
			throw new RuntimeException();
		}
	}
}
