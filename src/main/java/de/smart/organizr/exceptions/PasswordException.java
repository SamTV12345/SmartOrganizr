package de.smart.organizr.exceptions;

import de.smart.organizr.i18n.I18nExceptionUtils;

import java.io.Serial;

/**
 * Exception class in case the password is not valid.
 *
 *
 */
public class PasswordException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1762757029287980198L;

	/**
	 * constructor for the PasswordException
	 * @param message Message to be output when the exception occurs.
	 */
	public PasswordException(final String message) {
		super(message);
	}

	/**
	 * Throws an exception if the password is invalid.
	 * @return PasswordException with the message that the password is invalid
	 */
	public static PasswordException createPasswordInvalidException() {
		return new PasswordException(I18nExceptionUtils.getPasswordIsInvalid());
	}
}
