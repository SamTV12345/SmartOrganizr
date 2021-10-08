package de.smart.organizr.services.implementations;

import de.smart.organizr.dao.interfaces.NoteDao;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.services.interfaces.NoteService;

public class NoteServiceImpl implements NoteService {
	private final NoteDao noteDao;


	public NoteServiceImpl(final NoteDao noteDao){
		this.noteDao = noteDao;
	}

	@Override
	public Note saveNote(final Note note){
		return noteDao.saveNote(note);
	}
}
