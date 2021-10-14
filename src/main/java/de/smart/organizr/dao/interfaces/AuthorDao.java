package de.smart.organizr.dao.interfaces;

import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.User;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.Set;

/**
 * The author Dao handles every action related to authors
 */
public interface AuthorDao {
	/**
	 * Finds all authors of the user
	 * @param user the user
	 * @return a set of authors
	 */
	Set<Author> findAllAuthorsOfUser(User user);

	/**
	 * Finds an author by id
	 * @param authorId the id of the author
	 * @return an optional of the found author
	 */
	Optional<Author> findAuthorById(int authorId);

	/**
	 * Saves/updates an author
	 * @param author the author
	 * @return the saved author (with updated id, if id=0)
	 */
	Author saveAuthor(Author author);

	/**
	 * Deletes an author
	 * @param authorToDelete the author to be deleted
	 */
	void deleteAuthor(Author authorToDelete);
}
