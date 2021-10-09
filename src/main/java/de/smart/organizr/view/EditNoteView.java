package de.smart.organizr.view;

import de.smart.organizr.entities.classes.NoteHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.exceptions.AuthorException;
import de.smart.organizr.services.interfaces.AuthorService;
import de.smart.organizr.services.interfaces.NoteService;
import de.smart.organizr.utils.JsfUtils;

import java.util.Collection;

public class EditNoteView {

	private final NoteService noteService;
	private final AuthorService authorService;
	private final UserBean userBean;
	private final Folder currentFolder;
	private String title;
	private String description;
	private Author author;

	public EditNoteView(final NoteService noteService,
	                    final AuthorService authorService, final UserBean userBean){
		currentFolder = JsfUtils.getFolderFromFlash();
		this.noteService = noteService;
		this.authorService = authorService;
		this.userBean = userBean;
	}

	public String saveNote(){
		try {

			final Note noteToBeSaved = new NoteHibernateImpl(title, description, author,
					userBean.getUser());
			noteToBeSaved.setParent(currentFolder);
			noteService.saveNote(noteToBeSaved);
			currentFolder.getElements().add(noteToBeSaved);
			JsfUtils.putFolderIntoFlash(currentFolder);
			return "/viewFoldersView.xhtml";
		}
		catch (final AuthorException authorException){
			return null;
		}
	}

	public Collection<Author> getAllAuthors(){
		return authorService.findAllAuthorsByUser(userBean.getUser().getUserId());
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
}
