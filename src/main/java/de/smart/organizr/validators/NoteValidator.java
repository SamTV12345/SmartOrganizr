package de.smart.organizr.validators;

import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.exceptions.NoteException;

public final class NoteValidator {
	private NoteValidator(){
	}

	public static boolean validateTitle(final String title){
		return !title.isBlank();
	}

	public static void checkTitle(final String title){
		if(!validateTitle(title)){
			throw NoteException.createNoteTitleMayNotBeEmpty();
		}
	}

	public static boolean validateAuthor(final Author author){
		return !(author ==null);
	}

	public static void checkAuthor(final Author author){
		if(!validateAuthor(author)){
			throw NoteException.createNoteAuthorMayNotBeEmpty();
		}
	}
}
