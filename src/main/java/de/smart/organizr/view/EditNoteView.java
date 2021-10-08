package de.smart.organizr.view;

import de.smart.organizr.entities.classes.NoteHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.services.interfaces.NoteService;
import de.smart.organizr.utils.JsfUtils;

public class EditNoteView {

	private final NoteService noteService;
	private Folder currentFolder;
	private String title;
	private Author author;
	private String description;

	public EditNoteView(final NoteService noteService){
		this.noteService = noteService;
	}

	public String saveNote(){
		final Note noteToBeSaved = new NoteHibernateImpl(title, description, author);
		noteToBeSaved.setParent(currentFolder);
		noteService.saveNote(noteToBeSaved);
		JsfUtils.putFolderIntoFlash(currentFolder);
		return "/viewFoldersView.xhtml";
	}
}
