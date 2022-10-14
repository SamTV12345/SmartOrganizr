package de.smart.organizr.dao.interfaces;

import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

/**
 * The author Dao handles every action related to authors
 */
public interface AuthorDao {
	/**
	 * Finds all authors of the user
	 * @param user the user
	 * @return a set of authors
	 */
	Page<Author> findAllAuthorsOfUser(User user, Pageable pageable);

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

	Optional<Author> findAuthorByIdAndUser(int authorId, String user);
}
