package de.smart.organizr.services.implementations;

import de.smart.organizr.dao.interfaces.AuthorDao;
import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.dto.AuthorPatchDto;
import de.smart.organizr.dto.AuthorPatchDtoMapper;
import de.smart.organizr.dto.AuthorWithIndex;
import de.smart.organizr.dto.AuthorWithIndexMapper;
import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.AuthorException;
import de.smart.organizr.exceptions.UserException;
import de.smart.organizr.i18n.I18nExceptionUtils;
import de.smart.organizr.services.interfaces.AuthorService;
import de.smart.organizr.services.interfaces.NoteService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Component
public class AuthorServiceImpl implements AuthorService {
	private final AuthorDao authorDao;
	private final UserDao userDao;
	private final AuthorPatchDtoMapper authorPatchDtoMapper;
	private final NoteService noteService;
	private final AuthorWithIndexMapper authorWithIndexMapper;



	@Override
	@Transactional
	public Author saveAuthor(final Author author, String userId){
		final User user =
				userDao.findUserById(userId).orElseThrow(()->new UserException(I18nExceptionUtils.getUserUnknown()));
		author.setCreator(user);
		return authorDao.saveAuthor(author);
	}

	@Override
	public AuthorWithIndex createAuthor(final AuthorPatchDto authorPatchDto, final String userId) {
		final User user = userDao.findUserById(userId).orElseThrow(UserException::createUnknownUserException);
		final Author author = authorPatchDtoMapper.convertAuthorWithUser(authorPatchDto, (UserHibernateImpl) user);
		final int index = authorDao.getAuthorIndex(authorPatchDto.getName());
		final Author savedAuthor = authorDao.saveAuthor(author);
		return authorWithIndexMapper.convertAuthor(savedAuthor, index);
	}

	@Override
	public Page<Author> findAllAuthorsByUser(final String userId, final Optional<String> optionalFullTextSearch,
	                                         final Pageable pageable){
		final Optional<User> optionalUser = userDao.findUserById(userId);
		if(optionalUser.isEmpty()){
			throw UserException.createUnknownUserException();
		}
		if(optionalFullTextSearch.isPresent()){
			return authorDao.findAllAuthorsOfUserWithFullText(optionalUser.get(),pageable,optionalFullTextSearch.get());

		}
		return authorDao.findAllAuthorsOfUser(optionalUser.get(), pageable);
	}

	@Override
	public Optional<Author> findAuthorByIdAndUserId(final int authorId, final String userId){
		return authorDao.findAuthorByIdAndUser(authorId, userId);
	}

	@Override
	public Optional<Author> findAuthorByUserAndName(final User user, final String authorName){
		final Collection<Author> allAuthorsOfUser = findAllAuthorsByUser(user.getUserId(), Optional.empty(),
				PageRequest.of(0,2000,
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
	@Transactional
	public void deleteAuthor(final int authorIdToDelete, final String userId) {
		final Author author =
				authorDao.findAuthorByIdAndUser(authorIdToDelete,userId).orElseThrow(
						AuthorException::createUnknownAuthorException);
		final List<Note> notes = noteService.findAllNotesByAuthor(authorIdToDelete,userId);
		notes.forEach(note->noteService.deleteNoteById(note.getId()));
		authorDao.deleteAuthor(author);
	}

	@Override
	@Transactional
	public Author updateAuthor(final AuthorPatchDto authorPatchDto, final int authorId, final String user) {
		final Author author  =
				authorDao.findAuthorByIdAndUser(authorId, user).orElseThrow(
						AuthorException::createUnknownAuthorException);
		author.setName(authorPatchDto.getName());
		author.setExtraInformation(authorPatchDto.getExtraInformation());
		return author;
	}
}
