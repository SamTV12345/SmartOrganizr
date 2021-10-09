package de.smart.organizr.dao.jpa;

import de.smart.organizr.dao.interfaces.AuthorDao;
import de.smart.organizr.entities.classes.AuthorHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.repositories.AuthorRepository;

import java.util.Optional;
import java.util.Set;

public class AuthorDaoJpaImpl implements AuthorDao {
	private final AuthorRepository authorRepository;

	public AuthorDaoJpaImpl(final AuthorRepository authorRepository) {
		this.authorRepository = authorRepository;
	}

	@Override
	public Set<Author> findAllAuthorsOfUser(final User user){
		return authorRepository.findAuthorsByCreator(user.getUserId());
	}

	@Override
	public Optional<Author> findAuthorById(final int authorId) {
		final Optional<AuthorHibernateImpl> optionalAuthor =  authorRepository.findById(authorId);
		if(optionalAuthor.isEmpty()){
			return Optional.empty();
		}
		return Optional.of(optionalAuthor.get());
	}

	@Override
	public Author saveAuthor(final Author authorToBeSaved){
		return authorRepository.save((AuthorHibernateImpl) authorToBeSaved);
	}
}
