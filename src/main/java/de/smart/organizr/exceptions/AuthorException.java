package de.smart.organizr.exceptions;

import de.smart.organizr.i18n.I18nExceptionUtils;

import java.io.Serial;

public class AuthorException extends RuntimeException{


	/**
	 * constructor for a UserException
	 * @param message Message that should be passed along
	 */
	public AuthorException(final String message) {
		super(message.trim());
	}

	/**
	 * Throws a UserException if the user is unknown.
	 * @return UserException with the message that the user is unknown
	 */
	public static AuthorException createUnknownAuthorException() {
		return new AuthorException(I18nExceptionUtils.getAuthorUnknown());
	}
}
