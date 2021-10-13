package de.smart.organizr.view;

import de.smart.organizr.entities.classes.NoteHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.exceptions.AuthorException;
import de.smart.organizr.services.interfaces.AuthorService;
import de.smart.organizr.services.interfaces.NoteService;
import de.smart.organizr.services.interfaces.PDFService;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.utils.NavigationUtils;
import org.primefaces.model.DefaultStreamedContent;
import org.primefaces.model.StreamedContent;
import org.primefaces.model.file.UploadedFile;

import javax.annotation.PostConstruct;
import javax.faces.context.FacesContext;
import javax.faces.event.PhaseId;
import java.io.*;
import java.util.Calendar;
import java.util.Collection;

public class EditNoteView {

	private final NoteService noteService;
	private final AuthorService authorService;
	private final PDFService pdfService;
	private final UserBean userBean;
	private Folder currentFolder;
	private String title;
	private String description;
	private Author author;
	private int id;
	private Calendar calendar;
	private UploadedFile uploadedFile;

	public EditNoteView(final NoteService noteService,
	                    final AuthorService authorService,
	                    final PDFService pdfService, final UserBean userBean){
		this.pdfService = pdfService;
		currentFolder = JsfUtils.getFolderFromFlash();
		this.noteService = noteService;
		this.authorService = authorService;
		this.userBean = userBean;
	}

	@PostConstruct
	public void initialize(){
		final Note savedNote = JsfUtils.getNoteFromFlash();
		if (savedNote !=null){
			setAuthor(savedNote.getAuthor());
			setDescription(savedNote.getDescription());
			setTitle(savedNote.getTitle());
			setId(savedNote.getId());
			currentFolder = savedNote.getParent();
		}
	}

	public String saveNote(){
		try {
			if (calendar ==null){
				calendar = Calendar.getInstance();
			}

			final Note noteToBeSaved = new NoteHibernateImpl(calendar, id, currentFolder,description,
					userBean.getUser(),title, author);
			noteToBeSaved.setParent(currentFolder);
			final Note savedNote = noteService.saveNote(noteToBeSaved);
			currentFolder.getElements().add(noteToBeSaved);

			if(uploadedFile !=null) {
				try {
					pdfService.writePDF(uploadedFile, savedNote);
				}
				catch (final IOException e) {
					e.printStackTrace();
				}
			}
			else{
				System.out.println("Ist leer");
			}

			JsfUtils.putFolderIntoFlash(currentFolder);
			return navigateToViewFolders();
		}
		catch (final AuthorException authorException){
			return null;
		}
	}

	public boolean checkIfPDFForNoteIsAvailable(){
		if(id==0){
			return false;
		}
		else{
			return pdfService.checkIfPDFForNoteIsAvailable(id);
		}
	}

	public String getPathToPDF(){
		if(checkIfPDFForNoteIsAvailable()) {
			final String path =  pdfService.getPathOfPDF(id);
			System.out.println(new File(path).exists());
			return path;
		}
		else {
			System.out.println("Ist nicht da");
			return "";
		}
	}

	public String generateRandomIdForNotCaching() {
		return java.util.UUID.randomUUID().toString();
	}

	public void refreshStream() {
		getPdf();
	}

	public String navigateToViewFolders() {
		return NavigationUtils.navigateToCorrectVersion(userBean.getVersion());
	}

	public Collection<Author> getAllAuthors(){
		return authorService.findAllAuthorsByUser(userBean.getUser().getUserId());
	}

	public Folder getCurrentFolder() {
		return currentFolder;
	}

	public void setCurrentFolder(final Folder currentFolder) {
		this.currentFolder = currentFolder;
	}

	public StreamedContent getPdf() {
		final FacesContext context = FacesContext.getCurrentInstance();

		if (context.getCurrentPhaseId() == PhaseId.RENDER_RESPONSE) {
			// So, we're rendering the HTML. Return a stub StreamedContent so that it will generate right URL.
			return new DefaultStreamedContent();
		}
		else {
			return DefaultStreamedContent.builder()
			                             .contentType("application/pdf")
			                             .stream(() -> {
				                             try {
					                             return pdfService.loadPDFFromDisk(id);
				                             }
				                             catch (final IOException e) {
					                             e.printStackTrace();
				                             }
				                             return null;
			                             })
			                             .build();
		}
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
}
