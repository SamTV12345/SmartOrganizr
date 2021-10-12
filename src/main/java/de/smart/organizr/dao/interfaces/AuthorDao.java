package de.smart.organizr.dao.interfaces;

import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.User;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.Set;

public interface AuthorDao {
	Set<Author> findAllAuthorsOfUser(User user);

	Optional<Author> findAuthorById(int authorId);

	Author saveAuthor(Author author);

	void deleteAuthor(Author authorToDelete);
}
