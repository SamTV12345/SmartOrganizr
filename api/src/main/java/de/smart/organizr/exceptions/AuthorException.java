package de.smart.organizr.exceptions;

import de.smart.organizr.i18n.I18nExceptionUtils;

public class AuthorException extends RuntimeException{


	/**
	 * constructor for an author exception
	 * @param message Message that should be passed along
	 */
	public AuthorException(final String message) {
		super(message.trim());
	}

	/**
	 * Throws an exception if the author name is empty
	 * @return AuthorException with the message that the name is empty
	 */
	public static AuthorException createUnknownAuthorException() {
		return new AuthorException(I18nExceptionUtils.getAuthorUnknown());
	}

	/**
	 * Throws an exception if author id is negative
	 * @return AuthorException with the message that the author id is negative
	 */
	public static AuthorException createAuthorIdMayNotBeEmptyException() {
		return new AuthorException(I18nExceptionUtils.getAuthorIdMayNotBeNegative());
	}

	/**
	 * Throws an AuthorException if the author is unknown.
	 * @return AuthorException with the message that the author is unknown
	 */
	public static AuthorException createAuthorNameMayNotBeEmptyException() {
		return new AuthorException(I18nExceptionUtils.getAuthorNameMayNotBeEmpty());
	}
}
