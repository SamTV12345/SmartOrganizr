package de.smart.organizr.view;

import de.smart.organizr.entities.classes.AuthorHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.exceptions.AuthorException;
import de.smart.organizr.services.interfaces.AuthorService;
import de.smart.organizr.services.interfaces.FolderService;
import de.smart.organizr.services.interfaces.NoteService;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.utils.NavigationUtils;

import java.util.List;

public class EditAuthorView {
	private final AuthorService authorService;
	private final NoteService noteService;
	private final FolderService folderService;
	private final UserBean userBean;
	private String name;
	private int id;
	private String extraInformation;
	private List<Note> notesOfAuthor;

	public EditAuthorView(final UserBean userBean, final AuthorService authorService,
	                      final NoteService noteService,
	                      final FolderService folderService) {
		this.noteService = noteService;
		this.folderService = folderService;
		final Author authorFromFlash = JsfUtils.getAuthorFromFlash();
		if(authorFromFlash !=null){
			setId(authorFromFlash.getId());
			setName(authorFromFlash.getName());
			setExtraInformation(authorFromFlash.getExtraInformation());
			notesOfAuthor = noteService.findAllNotesByAuthor(authorFromFlash.getId());
		}
		this.userBean = userBean;
		this.authorService = authorService;
	}

	public String saveAuthor(){
		try {
			authorService.saveAuthor(new AuthorHibernateImpl(id, name, extraInformation, userBean.getUser()));
			return NavigationUtils.navigateToViewAuthors();
		}
		catch (final AuthorException authorException){
			JsfUtils.putErrorMessage(authorException.getMessage());
			return null;
		}
	}

	public void deleteElement(final Element elementToBeRemoved){
		if(elementToBeRemoved instanceof Folder folder) {
			folderService.deleteFolder(folder);
		}
		else if (elementToBeRemoved instanceof Note note){
			noteService.deleteNote(note);
			notesOfAuthor.remove(note);
		}
	}

	public void saveAndCreateAnotherAuthor(){
		try {
			authorService.saveAuthor(new AuthorHibernateImpl(id, name, extraInformation, userBean.getUser()));
			setId(0);
			setExtraInformation("");
			setName("");
		}
		catch (final AuthorException authorException){
			JsfUtils.putErrorMessage(authorException.getMessage());
		}
	}

	public String backToAuthorView(){
		return NavigationUtils.navigateToViewAuthors();
	}

	public String getName() {
		return name;
	}

	public void setName(final String name) {
		this.name = name;
	}

	public String getExtraInformation() {
		return extraInformation;
	}

	public void setExtraInformation(final String extraInformation) {
		this.extraInformation = extraInformation;
	}

	public int getId() {
		return id;
	}

	public void setId(final int id) {
		this.id = id;
	}

	public List<Note> getNotesOfAuthor() {
		return notesOfAuthor;
	}

	public void setNotesOfAuthor(final List<Note> notesOfAuthor) {
		this.notesOfAuthor = notesOfAuthor;
	}
}
