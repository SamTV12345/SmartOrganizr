package de.smart.organizr.dao.jpa;

import de.smart.organizr.dao.interfaces.NoteDao;
import de.smart.organizr.entities.classes.NoteHibernateImpl;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.repositories.NoteRepository;

public class NoteDaoJpaImpl implements NoteDao {
	private final NoteRepository noteRepository;

	public NoteDaoJpaImpl(final NoteRepository noteRepository) {
		this.noteRepository = noteRepository;
	}

	@Override
	public Note saveNote(final Note note){
		return noteRepository.save((NoteHibernateImpl) note);
	}
}
