package de.smart.organizr.services.implementations;

import de.smart.organizr.dao.interfaces.AuthorDao;
import de.smart.organizr.dao.interfaces.FolderDao;
import de.smart.organizr.dao.interfaces.NoteDao;
import de.smart.organizr.dao.interfaces.UserDao;
import de.smart.organizr.dto.FindNotePositionModel;
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
import de.smart.organizr.services.interfaces.NoteService;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.SQLException;
import java.util.Calendar;
import java.util.Collection;
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

	@Override
	@Transactional
	public String getPDFOfNote(final int noteId, final User userId) throws SQLException {
		final Note note = noteDao.findNoteByIdAndUser(noteId, userId).orElseThrow(()->
				ElementException.createElementUnknown(noteId));
		return note.getPdfContent();
	}

	@Override
	@Transactional
	public void updatePDFOfNote(final int noteId, final User userId, final String pdfContent) {
		final Note note = noteDao.findNoteByIdAndUser(noteId, userId).orElseThrow(()->
				ElementException.createElementUnknown(noteId));
		note.setPdfContent(pdfContent);
		note.setPdfAvailable(true);
	}

	@Override
	@Transactional
	public void deletePDFOfNoteById(final int noteId, final User userId) {
		final Note note = noteDao.findNoteByIdAndUser(noteId, userId).orElseThrow(()->
				ElementException.createElementUnknown(noteId));
		note.setPdfAvailable(false);
		note.setPdfContent(null);
	}

	@Override
	public FindNotePositionModel findPositionOfNoteInFolder(final int noteId, final User user) {
		final Note note = noteDao.findNoteByIdAndUser(noteId, user).orElseThrow(()->
				ElementException.createElementUnknown(noteId));
		final List<Note> notes = folderDao.findAllChildren(user.getUserId(),note.getParent().getId())
				.stream().filter(element -> element instanceof Note)
				                                .map(a->(Note)a).toList();
		int position = 0;
		Note prevNote;
		Note nextNote;
		for (final Note note1 : notes) {
			if(note1.getId() == noteId){
				break;
			}
			position++;
		}

		if(position == 0){
			prevNote = null;
		}else{
			prevNote = notes.get(position-1);
		}

		if(position == notes.size()-1){
			nextNote = null;
		}else{
			nextNote = notes.get(position+1);
		}
		return new FindNotePositionModel(prevNote, nextNote, position);
	}
}
