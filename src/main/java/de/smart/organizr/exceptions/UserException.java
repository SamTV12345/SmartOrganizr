package de.smart.organizr.exceptions;

import de.smart.organizr.i18n.I18nExceptionUtils;

import java.io.Serial;

/**
 * Exception class for the user
 *
 */
public final class UserException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = -2495503707219967063L;

	/**
	 * constructor for a UserException
	 * @param message Message that should be passed along
	 */
	public UserException(final String message) {
		super(message.trim());
	}

	/**
	 * Throws a UserException if the user is unknown.
	 * @return UserException with the message that the user is unknown
	 */
	public static UserException createUnknownUserException() {
		return new UserException(I18nExceptionUtils.getUserUnknown());
	}
}