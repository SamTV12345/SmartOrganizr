package de.smart.organizr.repositories;


import de.smart.organizr.entities.classes.NoteInConcert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface NoteInConcertRepository extends JpaRepository<NoteInConcert, Integer> {

	@Modifying
	@Query("DELETE FROM noteInConcert n WHERE n.concertHibernateImpl.id=:concertId AND n.noteInConcert.id=:noteId")
	void deleteNoteInConcert(final int noteId, final String concertId);

	@Query("SELECT n FROM noteInConcert n WHERE n.concertHibernateImpl.id=:concertId AND n.noteInConcert.id=:noteId")
	Optional<NoteInConcert> findNoteInConcertByConcertAndNoteId(String concertId, int noteId);

	@Query("DELETE FROM noteInConcert n WHERE n.noteInConcert.id=:id")
	@Modifying
	void deleteNoteById(int id);
}
