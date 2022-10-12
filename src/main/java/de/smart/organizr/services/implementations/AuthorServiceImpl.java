package de.smart.organizr.services.implementations;

import de.smart.organizr.dao.interfaces.AuthorDao;
import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.UserException;
import de.smart.organizr.services.interfaces.AuthorService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

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
	public Page<Author> findAllAuthorsByUser(final String userId, final Pageable pageable){
		final Optional<User> optionalUser = userDao.findUserById(userId);
		if(optionalUser.isEmpty()){
			throw UserException.createUnknownUserException();
		}
		return authorDao.findAllAuthorsOfUser(optionalUser.get(), pageable);
	}

	@Override
	public Optional<Author> findAuthorById(final int authorId){
		return authorDao.findAuthorById(authorId);
	}

	@Override
	public Optional<Author> findAuthorByUserAndName(final User user, final String authorName){
		final Collection<Author> allAuthorsOfUser = findAllAuthorsByUser(user.getUserId(),  PageRequest.of(0,2000,
				Sort.by("name").ascending()))
				.stream().toList();
		final List<Author> namesOfAuthors =
				allAuthorsOfUser
						.stream()
						.filter(author -> author.getName().equals(authorName))
						.toList();
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
