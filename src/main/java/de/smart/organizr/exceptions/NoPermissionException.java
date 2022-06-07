package de.smart.organizr.exceptions;


import de.smart.organizr.i18n.I18nExceptionUtils;

import java.io.Serial;

/**
 * Exception class in case there are no permissions.
 *
 */
public final class NoPermissionException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = -6909699351736904809L;

	/**
	 * constructor for the NoPermissionException
	 * @param message Message to be output when the exception occurs.
	 */
	public NoPermissionException(final String message) {
		super(message);
	}

	/**
	 * Throws an exception if the wrong password was entered.
	 * @return NoPerssionException with the message that the wrong password was entered.
	 */
	public static NoPermissionException createWrongPasswordException() {
		return new NoPermissionException(I18nExceptionUtils.getWrongPasswordException());
	}

	/**
	 * Throws an exception if the two new passwords are not identical (changing passwords).
	 * @return NoPermissionException with the message that the two passwords do not match.
	 */
	public static NoPermissionException createPasswordsNotEqualException(){
		return new NoPermissionException(I18nExceptionUtils.getPasswordsNotEqualException());
	}
}
