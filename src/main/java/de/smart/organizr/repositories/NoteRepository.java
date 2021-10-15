package de.smart.organizr.repositories;

import de.smart.organizr.entities.classes.NoteHibernateImpl;
import de.smart.organizr.entities.interfaces.Note;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface NoteRepository extends CrudRepository<NoteHibernateImpl, Integer> {
	@Query("SELECT note FROM NoteHibernateImpl note WHERE note.author.id=:id")
	List<Note> findAllNotesByAuthor(int id);
}
