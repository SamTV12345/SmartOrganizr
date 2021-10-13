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
import javax.faces.context.ExternalContext;
import javax.faces.context.FacesContext;
import javax.faces.event.PhaseId;
import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.net.MalformedURLException;
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
	private DefaultStreamedContent pdfForView;

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
		final File file = new File(pdfService.getPathOfPDF(id));

		try {
			final FileInputStream fileIn = new FileInputStream(file);
			pdfForView = DefaultStreamedContent.builder()
			                                   .name("your_invoice.pdf")
			                                   .contentType("application/pdf")
			                                   .stream(() -> fileIn)
			                                   .build();
		}
		catch (final FileNotFoundException e) {
			e.printStackTrace();
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

	public DefaultStreamedContent getPdfForView() {
		return pdfForView;
	}

	public void openFile( ) {
		final File file = new File(pdfService.getPathOfPDF(id));

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
}
