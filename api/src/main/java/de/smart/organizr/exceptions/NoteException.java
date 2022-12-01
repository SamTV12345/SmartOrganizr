package de.smart.organizr.exceptions;

import de.smart.organizr.i18n.I18nExceptionUtils;

public class NoteException extends RuntimeException{
	private NoteException(final String message){
		super(message);
	}

	public static NoteException createNoteTitleMayNotBeEmpty(){
		return new NoteException(I18nExceptionUtils.getNoteTitleMayNotBeEmpty());
	}

	public static NoteException createNoteAuthorMayNotBeEmpty(){
		return new NoteException(I18nExceptionUtils.getNoteAuthorMayNotBeEmpty());
	}
}
