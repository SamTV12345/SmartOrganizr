package de.smart.organizr.validators;

import de.smart.organizr.exceptions.AuthorException;

public final class AuthorValidator {
	private AuthorValidator(){

	}

	public static boolean validateAuthorName(final String authorName){
		return ! authorName.isBlank();
	}

	public static void checkAuthorName(final String authorName){
		if (!validateAuthorName(authorName)){
			throw AuthorException.createAuthorNameMayNotBeEmptyException();
		}
	}

	public static boolean validateAuthorId(final int id){
		return id>=0;
	}

	public static void checkAuthorId(final int id){
		if (!validateAuthorId(id)){
			throw AuthorException.createAuthorIdMayNotBeEmptyException();
		}
	}
}
