package de.smart.organizr.services.implementations;

import de.smart.organizr.dao.interfaces.AuthorDao;
import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.UserException;
import de.smart.organizr.services.interfaces.AuthorService;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

public class AuthorServiceImpl implements AuthorService {
	private final AuthorDao authorDao;
	private final UserDao userDao;

	public AuthorServiceImpl(final AuthorDao authorDao, final UserDao userDao) {
		this.authorDao = authorDao;
		this.userDao = userDao;
	}

	@Override
	public Author saveAuthor(final Author author){
		return authorDao.saveAuthor(author);
	}

	@Override
	public List<Author> findAllAuthorsByUser(final String userId){
		final Optional<User> optionalUser = userDao.findUserById(userId);
		if(optionalUser.isEmpty()){
			throw UserException.createUnknownUserException();
		}
		return new ArrayList<>(authorDao.findAllAuthorsOfUser(optionalUser.get()));
	}

	@Override
	public Optional<Author> findAuthorById(final int authorId){
		return authorDao.findAuthorById(authorId);
	}

	@Override
	public Optional<Author> findAuthorByUserAndName(final User user, final String authorName){
		final Collection<Author> allAuthorsOfUser = findAllAuthorsByUser(user.getUserId());
		final List<Author> namesOfAuthors =
				allAuthorsOfUser.stream().filter(author -> author.getName().equals(authorName)).toList();
		if(namesOfAuthors.isEmpty()){
			return Optional.empty();
		}
		else
		{
			return Optional.of(namesOfAuthors.get(0));
		}
	}

	@Override
	public void deleteAuthor(final Author authorToDelete) {
		authorDao.deleteAuthor(authorToDelete);
	}
}
