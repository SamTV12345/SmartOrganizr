package de.smart.organizr.dao.interfaces;

import de.smart.organizr.entities.interfaces.Note;


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
}
