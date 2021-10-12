package de.smart.organizr.view;

import de.smart.organizr.entities.classes.NoteHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.exceptions.AuthorException;
import de.smart.organizr.services.interfaces.AuthorService;
import de.smart.organizr.services.interfaces.NoteService;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.utils.NavigationUtils;

import javax.annotation.PostConstruct;
import java.util.Calendar;
import java.util.Collection;

public class EditNoteView {

	private final NoteService noteService;
	private final AuthorService authorService;
	private final UserBean userBean;
	private Folder currentFolder;
	private String title;
	private String description;
	private Author author;
	private int id;
	private Calendar calendar;

	public EditNoteView(final NoteService noteService,
	                    final AuthorService authorService, final UserBean userBean){
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
			noteService.saveNote(noteToBeSaved);
			currentFolder.getElements().add(noteToBeSaved);

			JsfUtils.putFolderIntoFlash(currentFolder);
			return navigateToViewFolders();
		}
		catch (final AuthorException authorException){
			return null;
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
}
