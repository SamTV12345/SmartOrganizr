package de.smart.organizr.exceptions;

import de.smart.organizr.i18n.I18nExceptionUtils;

import java.io.Serial;

/**
 * Exception-Klasse für den Fall, dass das Passwort nicht gültig ist
 * 
 *
 */
public class PasswordException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1762757029287980198L;

	/**
	 * Konstruktor für die PasswordException
	 * @param message Nachricht, die beim Auftreten der Exception ausgegeben werden soll
	 */
	public PasswordException(final String message) {
		super(message);
	}

	/**
	 * Wirft eine Exception, wenn das Passwort ungültig ist
	 * @return PasswordException mit der Nachricht, dass das Passwort ungültig ist
	 */
	public static PasswordException createPasswordInvalidException() {
		return new PasswordException(I18nExceptionUtils.getPasswordIsInvalid());
	}
}
