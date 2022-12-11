package de.smart.organizr.services.interfaces;

import de.smart.organizr.dto.ConcertPatchDto;
import de.smart.organizr.dto.ConcertPostDto;
import de.smart.organizr.entities.classes.ConcertHibernateImpl;

public interface ConcertService {
	ConcertHibernateImpl createConcertForUser(ConcertPostDto concertPostDto);

	ConcertHibernateImpl updateConcert(ConcertPatchDto concertPatchDto, int id, String userId);
}
