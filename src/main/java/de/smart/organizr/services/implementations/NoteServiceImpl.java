package de.smart.organizr.services.implementations;

import de.smart.organizr.dao.interfaces.AuthorDao;
import de.smart.organizr.dao.interfaces.NoteDao;
import de.smart.organizr.dto.NotePatchDto;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Note;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.AuthorException;
import de.smart.organizr.exceptions.ElementException;
import de.smart.organizr.services.interfaces.NoteService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@AllArgsConstructor
@Component
public class NoteServiceImpl implements NoteService {
	private final NoteDao noteDao;
	private final AuthorDao authorDao;

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
}
