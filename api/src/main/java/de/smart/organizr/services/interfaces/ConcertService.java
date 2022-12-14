package de.smart.organizr.services.interfaces;

import de.smart.organizr.dto.ConcertDto;
import de.smart.organizr.dto.ConcertPatchDto;
import de.smart.organizr.dto.ConcertPostDto;
import de.smart.organizr.entities.classes.ConcertHibernateImpl;

import java.util.Set;

public interface ConcertService {
	ConcertHibernateImpl createConcertForUser(ConcertPostDto concertPostDto);

	ConcertHibernateImpl updateConcert(ConcertPatchDto concertPatchDto, int id, String userId);

	Set<ConcertDto> getConcertsOfUserSortedByDate(String user);
}
