package de.smart.organizr.services.interfaces;

import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.User;

import java.util.List;
import java.util.Optional;

public interface AuthorService {
	/**
	 * Saves an author
	 * @param author the author to be saved
	 * @return the saved author
	 */
	Author saveAuthor(Author author);

	/**
	 * Finds all authors by user
	 * @param userId the user id
	 * @return all authors that were created by the user
	 */
	List<Author> findAllAuthorsByUser(String userId);

	/**
	 * Finds the author by id
	 * @param authorId the author id
	 * @return an optional of the author
	 */
	Optional<Author> findAuthorById(int authorId);

	/**
	 * Finds an author by user and name
	 * @param user the user
	 * @param authorName the author name
	 * @return an optional of the author
	 */
	Optional<Author> findAuthorByUserAndName(User user, String authorName);

	/**
	 * Deletes the author
	 * @param authorToDelete the author to be deleted
	 */
	void deleteAuthor(Author authorToDelete);
}
