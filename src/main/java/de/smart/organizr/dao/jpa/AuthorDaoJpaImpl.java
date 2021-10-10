package de.smart.organizr.dao.jpa;

import de.smart.organizr.dao.interfaces.AuthorDao;
import de.smart.organizr.entities.classes.AuthorHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.repositories.AuthorRepository;

import java.util.Optional;
import java.util.Set;

/**
 * The AuthorDaoJpaImpl class takes care of every database action related to authors
 */
public class AuthorDaoJpaImpl implements AuthorDao {
	private final AuthorRepository authorRepository;

	public AuthorDaoJpaImpl(final AuthorRepository authorRepository) {
		this.authorRepository = authorRepository;
	}

	/**
	 * Finds all authors that the user created in the database
	 * @param user the user who requested and created the author
	 * @return a set of authors created by the user
	 */
	@Override
	public Set<Author> findAllAuthorsOfUser(final User user){
		return authorRepository.findAuthorsByCreator(user.getUserId());
	}

	/**
	 * Finds the requested author by id
	 * @param authorId the author id
	 * @return an optional author that is found
	 */
	@Override
	public Optional<Author> findAuthorById(final int authorId) {
		final Optional<AuthorHibernateImpl> optionalAuthor =  authorRepository.findById(authorId);
		if(optionalAuthor.isEmpty()){
			return Optional.empty();
		}
		return Optional.of(optionalAuthor.get());
	}

	/**
	 * Saves and updates an author
	 * @param authorToBeSaved the author to be saved/updated
	 * @return the savedAuthor
	 */
	@Override
	public Author saveAuthor(final Author authorToBeSaved){
		return authorRepository.save((AuthorHibernateImpl) authorToBeSaved);
	}
}
