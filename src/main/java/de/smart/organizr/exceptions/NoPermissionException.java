package de.smart.organizr.exceptions;


import de.smart.organizr.i18n.I18nExceptionUtils;

import java.io.Serial;

/**
 * Exception-Klasse für den Fall, dass keine Berechtigungen vorliegen.
 *
 */
public final class NoPermissionException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = -6909699351736904809L;

	/**
	 * Konstruktor für die NoPermissionException
	 * @param message Nachricht, die beim Auftreten der Exception ausgegeben werden soll
	 */
	private NoPermissionException(final String message) {
		super(message);
	}
	
	/**
	 * Wirft eine Exception, wenn das falsche Passwort eingegeben wurde
	 * @return NoPerssionException mit der Nachricht, dass das falsche Passwort eingegeben wurde
	 */
	public static NoPermissionException createWrongPasswordException() {
		return new NoPermissionException(I18nExceptionUtils.getWrongPasswordException());
	}

	/**
	 * Wirft eine Exception, wenn die beiden neuen Passwörter nicht identisch sind (Ändern der Passwörter)
	 * @return NoPermissionException mit der Nachricht, dass die beiden Passwörter nicht übereinstimmen
	 */
	public static NoPermissionException createPasswordsNotEqualException(){
		return new NoPermissionException(I18nExceptionUtils.getPasswordsNotEqualException());
	}
}
