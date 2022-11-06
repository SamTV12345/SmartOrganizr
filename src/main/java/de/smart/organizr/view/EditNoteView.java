package de.smart.organizr.view;

import de.smart.organizr.entities.classes.NoteHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.exceptions.AuthorException;
import de.smart.organizr.exceptions.ElementException;
import de.smart.organizr.exceptions.NoteException;
import de.smart.organizr.services.interfaces.AuthorService;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.services.interfaces.NoteService;
import de.smart.organizr.services.interfaces.PDFService;
import de.smart.organizr.utils.BarCodeUtils;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.utils.NavigationUtils;
import lombok.Getter;
import lombok.Setter;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.primefaces.PrimeFaces;
import org.primefaces.event.CaptureEvent;
import org.primefaces.model.DefaultStreamedContent;
import org.primefaces.model.file.UploadedFile;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import javax.annotation.PostConstruct;
import javax.faces.context.ExternalContext;
import javax.faces.context.FacesContext;
import javax.imageio.ImageIO;
import javax.servlet.http.HttpServletResponse;
import java.awt.image.BufferedImage;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.Calendar;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Setter
@Getter
public class EditNoteView {

	private final NoteService noteService;
	private final AuthorService authorService;
	private final FolderService folderService;
	private final PDFService pdfService;
	private final UserBean userBean;
	private Folder currentFolder;
	private String title;
	private String description;
	private int numberOfPages;
	private Author author;
	private int id;
	private Calendar calendar;
	private UploadedFile uploadedFile;
	private DefaultStreamedContent pdfForView;
	private List<Folder> allFolders;
	private boolean firstSave;

	public EditNoteView(final NoteService noteService,
	                    final AuthorService authorService,
	                    final FolderService folderService,
	                    final PDFService pdfService, final UserBean userBean){
		firstSave = true;
		this.folderService = folderService;
		this.pdfService = pdfService;
		currentFolder = JsfUtils.getFolderFromFlash();
		this.noteService = noteService;
		this.authorService = authorService;
		this.userBean = userBean;
		allFolders = folderService.findAllFolders(userBean.getUser().getUserId());
	}

	@PostConstruct
	public void initialize(){

		final Note savedNote = JsfUtils.getNoteFromFlash();
		if (savedNote !=null){
			firstSave = false;
			setAuthor(savedNote.getAuthor());
			setDescription(savedNote.getDescription());
			setTitle(savedNote.getTitle());
			this.calendar = savedNote.getCreationDate();
			setId(savedNote.getId());
			currentFolder = savedNote.getParent();
			setNumberOfPages(savedNote.getNumberOfPages());
		}

		if(checkIfPDFForNoteIsAvailable()) {
			try {
				final File file = new File(pdfService.getPathMediaFolderOfPDF(id));
				final FileInputStream fileIn = new FileInputStream(file);
				pdfForView = DefaultStreamedContent.builder()
				                                   .name("pdf_for_%d.pdf".formatted(id))
				                                   .contentType("application/pdf")
				                                   .stream(() -> fileIn)
				                                   .build();
			}
			catch (final FileNotFoundException e) {
				e.printStackTrace();
			}
		}
	}

	public String saveNote(){
		try {
			saveNoteInFolder();
			return navigateToViewFolders();
		}
		catch (final ElementException | NoteException| IOException| AuthorException exception){
			JsfUtils.putErrorMessage(exception.getLocalizedMessage());
			return null;
		}
	}

	private void saveNoteInFolder() throws IOException {

			if (firstSave) {
				calendar = Calendar.getInstance();
			}
			else{
				final Note extractedNote = noteService.findNoteById(id).get();
				extractedNote.getParent().getElements().remove(extractedNote);
				folderService.saveFolder(extractedNote.getParent());
			}

			final Note noteToBeSaved = new NoteHibernateImpl(calendar, id, currentFolder, description,
					userBean.getUser(), title, author, numberOfPages);
			noteToBeSaved.setParent(currentFolder);
			final Note savedNote = noteService.saveNote(noteToBeSaved);
			currentFolder.getElements().add(noteToBeSaved);

			if (uploadedFile != null) {
					pdfService.writePDF(uploadedFile, savedNote);

		}

	}

	public boolean checkIfNoteIsAlreadySaved(){
		return id!=0;
	}

	public boolean checkIfPDFForNoteIsAvailable(){
		if(id==0){
			return false;
		}
		else{
			return pdfService.checkIfPDFForNoteIsAvailable(id);
		}
	}

	public String navigateToViewFolders() {
		return NavigationUtils.navigateToCorrectVersion(userBean.getVersion());
	}

	public Collection<Author> getAllAuthors(){
		return authorService.findAllAuthorsByUser(userBean.getUser().getUserId(), Optional.empty(),
				                    PageRequest.of(0,2000,
				                    Sort.by("name").ascending()))
		                    .stream().toList();
	}

	public Folder getCurrentFolder() {
		return currentFolder;
	}

	public void setCurrentFolder(final Folder currentFolder) {
		this.currentFolder = currentFolder;
	}

	public DefaultStreamedContent getPdfForView() {
		return pdfForView;
	}

	public byte[] getCurrentStatusOfNote(){
		try {
			return BarCodeUtils.generateQRCodeByteArray(new NoteHibernateImpl(calendar, id, currentFolder, description,
					userBean.getUser(), title, author, numberOfPages).toString());
		}
		catch (final NoteException noteException){
			JsfUtils.putErrorMessage(noteException.getLocalizedMessage());
			return null;
		}
	}

	public void openFile( ) {
		final File file = new File(pdfService.getPathMediaFolderOfPDF(id));

		final FacesContext facesContext = FacesContext.getCurrentInstance();
		final ExternalContext externalContext = facesContext.getExternalContext();
		final HttpServletResponse response = (HttpServletResponse) externalContext.getResponse();

		try (final BufferedInputStream input = new BufferedInputStream(new FileInputStream(file), 10240);
		     final BufferedOutputStream output = new BufferedOutputStream(response.getOutputStream(), 10240)){
			// Open file.

			// Init servlet response.
			response.reset();
			// lire un fichier pdf
			response.setHeader("Content-type", "application/pdf");
			response.setContentLength((int)file.length());

			response.setHeader("Content-disposition", "inline; filename=" + file.getName());
			response.setHeader("pragma", "public");

			// Write file contents to response.
			final byte[] buffer = new byte[10240];
			int length;
			while ((length = input.read(buffer)) > 0) {
				output.write(buffer, 0, length);
			}

			// Finalize task.
			output.flush();
		}
		catch (final IOException e) {
			e.printStackTrace();
		}
	}
	
	public void saveAndCreateAnotherNote(){
		try {
			saveNoteInFolder();
			setId(0);
			setTitle("");
			setDescription("");
			setAuthor(null);
			setPdfForView(null);
		}
		catch (final ElementException |NoteException|IOException exception){
			JsfUtils.putErrorMessage(exception.getLocalizedMessage());
		}
	}

	public void onCaptureSongTitle(CaptureEvent captureEvent) throws TesseractException, IOException {
		final String oncapture = oncapture(captureEvent);
		System.out.println(oncapture);
		setTitle(oncapture);
		PrimeFaces.current().ajax().update("note-form:folder-name");
	}

	public String oncapture(CaptureEvent captureEvent) throws IOException, TesseractException {
		byte[] data = captureEvent.getData();


		Tesseract tesseract = new Tesseract();
		tesseract.setDatapath("C:\\Program Files\\Tesseract-OCR\\tessdata");
		tesseract.setOcrEngineMode(1);
		tesseract.setPageSegMode(5);
		tesseract.setLanguage("eng");
		InputStream is = new ByteArrayInputStream(data);
		BufferedImage newBi = ImageIO.read(is);
		return tesseract.doOCR(newBi).split("\n")[0];
	}

	public void setPdfForView(final DefaultStreamedContent pdfForView) {
		this.pdfForView = pdfForView;
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(final String title) {
		this.title = title;
	}

	public Author getAuthor() {
		return author;
	}

	public void setAuthor(final Author author) {
		this.author = author;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(final String description) {
		this.description = description;
	}

	public int getId() {
		return id;
	}

	public void setId(final int id) {
		this.id = id;
	}

	public UploadedFile getUploadedFile() {
		return uploadedFile;
	}

	public void setUploadedFile(final UploadedFile uploadedFile) {
		this.uploadedFile = uploadedFile;
	}

	public List<Folder> getAllFolders() {
		return allFolders;
	}

	public void setAllFolders(final List<Folder> allFolders) {
		this.allFolders = allFolders;
	}
}
