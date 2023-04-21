package de.smart.organizr.dao.interfaces;

import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.entities.interfaces.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.List;
import java.util.Optional;


public interface NoteDao {
	/**
	 * Saves a note
	 * @param note the note to be saved
	 * @return the saved/updated note
	 */
	Note saveNote(Note note);

	/**
	 * Deletes the note
	 * @param note the note to be deleted
	 */
	void deleteNote(Note note);

	List<Note> findAllNotesByAuthor(int id, final String userId);

	Optional<Note> findNoteById(int id);

	void deleteById(int noteId);

	Optional<Note> findNoteByIdAndUser(int id, User user);

	Page<Note> findPagedNotesOfAuthorByName(String noteName, final String userId, Pageable pageable);

	Page<Note> findPagedNotesOfAuthorByName(String userId, Pageable pageable);

	Collection<Note> findAllNotesByUsername(User user);
}
