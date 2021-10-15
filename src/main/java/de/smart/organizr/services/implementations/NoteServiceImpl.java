package de.smart.organizr.services.implementations;

import de.smart.organizr.dao.interfaces.NoteDao;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.services.interfaces.NoteService;

import java.util.List;

public class NoteServiceImpl implements NoteService {
	private final NoteDao noteDao;


	public NoteServiceImpl(final NoteDao noteDao){
		this.noteDao = noteDao;
	}

	@Override
	public Note saveNote(final Note note){
		return noteDao.saveNote(note);
	}

	@Override
	public void deleteNote(final Note note) {
		noteDao.deleteNote(note);
	}

	@Override
	public List<Note> findAllNotesByAuthor(final int id) {
		return noteDao.findAllNotesByAuthor(id);
	}
}
