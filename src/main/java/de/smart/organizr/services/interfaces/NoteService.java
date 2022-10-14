package de.smart.organizr.services.interfaces;

import de.smart.organizr.entities.interfaces.Note;

import java.util.List;
import java.util.Optional;

public interface NoteService {
	/**
	 * Saves a note
	 * @param note the note to be saved
	 * @return the note
	 */
	Note saveNote(Note note);

	/**
	 * Deletes a note
	 * @param note the note to be deleted
	 */
	void deleteNote(Note note);

	List<Note> findAllNotesByAuthor(int id, final String userId);

	Optional<Note> findNoteById(int id);
}
