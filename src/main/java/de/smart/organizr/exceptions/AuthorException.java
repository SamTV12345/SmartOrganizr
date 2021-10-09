package de.smart.organizr.exceptions;

import de.smart.organizr.i18n.I18nExceptionUtils;

import java.io.Serial;

public class AuthorException extends RuntimeException{


	/**
	 * Konstruktor für eine UserException
	 * @param message Nachricht, die mitgegeben werden soll
	 */
	public AuthorException(final String message) {
		super(message.trim());
	}

	/**
	 * Wirft eine UserException, wenn der Benutzer unbekannt ist
	 * @return UserException mit der Nachricht, dass der Benutzer nicht bekannt ist
	 */
	public static AuthorException createUnknownAuthorException() {
		return new AuthorException(I18nExceptionUtils.getAuthorUnknown());
	}
}
