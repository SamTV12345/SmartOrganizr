package de.smart.organizr.services.implementations;

import de.smart.organizr.dao.interfaces.AuthorDao;
import de.smart.organizr.dao.interfaces.FolderDao;
import de.smart.organizr.dao.interfaces.NoteDao;
import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.dto.NotePatchDto;
import de.smart.organizr.dto.NotePostDto;
import de.smart.organizr.entities.classes.NoteHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Element;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.AuthorException;
import de.smart.organizr.exceptions.ElementException;
import de.smart.organizr.exceptions.UserException;
import de.smart.organizr.repositories.NoteInConcertRepository;
import de.smart.organizr.services.interfaces.NoteService;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Calendar;
import java.util.List;
import java.util.Optional;

@AllArgsConstructor
@Component
public class NoteServiceImpl implements NoteService {
	private final NoteDao noteDao;
	private final AuthorDao authorDao;
	private final FolderDao folderDao;
	private final UserDao userDao;


	@Override
	public Note saveNote(final Note note){
		return noteDao.saveNote(note);
	}

	@Override
	public void deleteNote(final Note note) {

		noteDao.deleteNote(note);
	}

	@Override
	public void deleteNoteById(final int noteId) {
		noteDao.deleteById(noteId);
	}

	@Override
	public List<Note> findAllNotesByAuthor(final int id, final String userId) {
		return noteDao.findAllNotesByAuthor(id, userId);
	}

	@Override
	public Optional<Note> findNoteById(final int id) {
		return noteDao.findNoteById(id);
	}

	@Override
	@Transactional
	public Note updateNote(final NotePatchDto note, final User user) {
		final Note originalNote = noteDao.findNoteByIdAndUser(note.getId(), user).orElseThrow(ElementException::createElementIdMayNotBeNegative);
		final Author author =
				authorDao.findAuthorByIdAndUser(note.getAuthorId(), user.getUserId()).orElseThrow(AuthorException::createUnknownAuthorException);
		originalNote.setTitle(note.getTitle());
		originalNote.setAuthor(author);
		originalNote.setDescription(note.getDescription());
		originalNote.setNumberOfPages(note.getNumberOfPages());
		return originalNote;
	}

	@Override
	public Note saveNoteForUser(final NotePostDto notePostDto, final String userId) {
		final Folder parent = folderDao.findFolderByIdAndUsername(notePostDto.getParentId(),userId).orElseThrow(
				ElementException::createElementNameMayNotBeEmptyException);
		final Author author =
				authorDao.findAuthorByIdAndUser(notePostDto.getAuthorId(), userId).orElseThrow(AuthorException::createUnknownAuthorException);
		final User user = userDao.findUserById(userId).orElseThrow(UserException::createUnknownUserException);
		return noteDao.saveNote(new NoteHibernateImpl(Calendar.getInstance(),0,parent, notePostDto.getDescription(),
				user, notePostDto.getTitle(),author,notePostDto.getNumberOfPages()));
	}

	@Override
	public int getParentOfNote(final int noteId, final String userId) {
		final Element parent =
				folderDao.findByIdAndUsername(noteId,userId).orElseThrow(ElementException::createElementIdMayNotBeNegative)
				         .getParent();
		if(parent == null){
			return -100;
		}
		return parent.getId();
	}

	@Override
	public Page<Note> findAllNotesByName(final String noteName, final User user, final Pageable pageable) {
		if(noteName==null){
			return noteDao.findPagedNotesOfAuthorByName(user.getUserId(), pageable);
		}
		return noteDao.findPagedNotesOfAuthorByName(noteName, user.getUserId(), pageable);
	}
}
