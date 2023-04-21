package de.smart.organizr.repositories;

import de.smart.organizr.entities.classes.NoteHibernateImpl;
import de.smart.organizr.entities.interfaces.Note;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;

public interface NoteRepository extends CrudRepository<NoteHibernateImpl, Integer> {
	@Query("SELECT note FROM NoteHibernateImpl note WHERE note.author.id=:id and note.creator.userId=:userId")
	List<Note> findAllNotesByAuthor(int id, final String userId);

	@Query("SELECT note FROM NoteHibernateImpl note WHERE note.creator.userId=:userId and note.id=:id")
	Optional<Note> findNoteByIdAndUser(int id, String userId);

	@Query("SELECT note FROM NoteHibernateImpl note WHERE note.title LIKE CONCAT('%',:noteName,'%') AND note.creator" +
			".userId=:userId")
	Page<Note> findNotesByName(String noteName, String userId, Pageable pageable);

	@Query("SELECT note FROM NoteHibernateImpl note WHERE note.creator" +
			".userId=:userId")
	Page<Note> findNotesByName(String userId, Pageable pageable);

	List<Note> findByCreatorUserId(String userId);
}
