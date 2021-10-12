package de.smart.organizr.services.interfaces;

import de.smart.organizr.entities.interfaces.Note;

public interface NoteService {
	Note saveNote(Note note);

	void deleteNote(Note note);
}
