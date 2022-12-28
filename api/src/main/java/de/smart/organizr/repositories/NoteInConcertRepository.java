package de.smart.organizr.repositories;


import de.smart.organizr.entities.classes.ConcertHibernateImpl;
import de.smart.organizr.entities.classes.NoteHibernateImpl;
import de.smart.organizr.entities.classes.NoteInConcert;
import de.smart.organizr.entities.interfaces.Concert;
import de.smart.organizr.entities.interfaces.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface NoteInConcertRepository extends JpaRepository<NoteInConcert, Integer> {

	@Modifying
	@Query("DELETE FROM noteInConcert n WHERE n.concertHibernateImpl.id=:concertId AND n.noteInConcert.id=:noteId")
	void deleteNoteInConcert(final int noteId, final String concertId);
}
