package de.smart.organizr.dao.jpa;

import de.smart.organizr.dao.interfaces.NoteDao;
import de.smart.organizr.entities.classes.NoteHibernateImpl;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.repositories.NoteRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * The NoteDaoJpaImpl class takes care of every database action related to notes
 */
public class NoteDaoJpaImpl implements NoteDao {
	private final NoteRepository noteRepository;

	public NoteDaoJpaImpl(final NoteRepository noteRepository) {
		this.noteRepository = noteRepository;
	}

	/**
	 * Saves/Updates a note
	 * @param note the note to be saved/updated.
	 * @return the saved note
	 */
	@Override
	public Note saveNote(final Note note){
		return noteRepository.save((NoteHibernateImpl) note);
	}

	@Transactional
	@Override
	public void deleteNote(final Note note) {
		noteRepository.deleteById(note.getId());
	}

	/**
	 * Finds all notes by author
	 *
	 * @param id     the id of the author
	 * @param userId the id of the user
	 * @return A list of all notes by this author
	 */
	@Override
	public List<Note> findAllNotesByAuthor(final int id, final String userId) {
		return noteRepository.findAllNotesByAuthor(id, userId);
	}

	@Override
	public Optional<Note> findNoteById(final int id) {
		final Optional<NoteHibernateImpl> optionalNote = noteRepository.findById(id);
		if(optionalNote.isEmpty()){
			return Optional.empty();
		}
		return Optional.of(optionalNote.get());

	}

	@Override
	public void deleteById(final int noteId) {
		noteRepository.deleteById(noteId);
	}
}
