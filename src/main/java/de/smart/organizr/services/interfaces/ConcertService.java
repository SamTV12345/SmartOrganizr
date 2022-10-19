package de.smart.organizr.services.interfaces;

import de.smart.organizr.dto.ConcertPatchDto;
import de.smart.organizr.dto.ConcertPostDto;
import de.smart.organizr.entities.classes.ConcertHibernateImpl;
import de.smart.organizr.entities.classes.NoteInConcert;
import org.springframework.transaction.annotation.Transactional;

public interface ConcertService {
	ConcertHibernateImpl createConcertForUser(ConcertPostDto concertPostDto);

	@Transactional
	ConcertHibernateImpl updateConcert(ConcertPatchDto concertPatchDto, int id, String userId);

	@Transactional
	ConcertHibernateImpl addNoteToConcert(NoteInConcert noteInConcert, String userId);

	@Transactional
	ConcertHibernateImpl addNoteToConcert(int concertId, NoteInConcert noteInConcert, String userId);
}
