package de.smart.organizr.exceptions;

import de.smart.organizr.i18n.I18nExceptionUtils;

import java.io.Serial;

/**
 * Exception-Klasse für den Benutzer
 * @author thomas
 *
 */
public final class UserException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = -2495503707219967063L;

	/**
	 * Konstruktor für eine UserException
	 * @param message Nachricht, die mitgegeben werden soll
	 */
	public UserException(final String message) {
		super(message.trim());
	}

	/**
	 * Wirft eine UserException, wenn der Benutzer unbekannt ist
	 * @return UserException mit der Nachricht, dass der Benutzer nicht bekannt ist
	 */
	public static UserException createUnknownUserException() {
		return new UserException(I18nExceptionUtils.getUserUnknown());
	}
}