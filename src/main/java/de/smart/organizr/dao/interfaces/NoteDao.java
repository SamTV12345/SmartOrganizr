package de.smart.organizr.dao.interfaces;

import de.smart.organizr.entities.interfaces.Note;

public interface NoteDao {
	Note saveNote(Note note);

	void deleteNote(Note note);
}
