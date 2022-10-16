package de.smart.organizr.services.interfaces;

import de.smart.organizr.dto.NotePatchDto;
import de.smart.organizr.dto.NotePostDto;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.entities.interfaces.User;

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

	void deleteNoteById(int noteId);
	List<Note> findAllNotesByAuthor(int id, final String userId);

	Optional<Note> findNoteById(int id);

	Note updateNote(NotePatchDto note, User user);

	Note saveNoteForUser(NotePostDto notePostDto, String userId);
}
