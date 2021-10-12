package de.smart.organizr.services.interfaces;

import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.User;

import java.util.Collection;
import java.util.Optional;

public interface AuthorService {
	Author saveAuthor(Author author);

	Collection<Author> findAllAuthorsByUser(int userId);

	Optional<Author> findAuthorById(int authorId);

	Optional<Author> findAuthorByUserAndName(User user, String authorName);

	void deleteAuthor(Author authorToDelete);
}
