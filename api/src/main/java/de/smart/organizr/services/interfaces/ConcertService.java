package de.smart.organizr.services.interfaces;

import de.smart.organizr.dto.ConcertDto;
import de.smart.organizr.dto.ConcertPatchDto;
import de.smart.organizr.dto.ConcertPostDto;
import de.smart.organizr.entities.classes.ConcertHibernateImpl;

import java.util.List;
import java.util.Set;

public interface ConcertService {
	ConcertDto createConcertForUser(ConcertPostDto concertPostDto);

	ConcertDto updateConcert(ConcertPatchDto concertPatchDto, String id, String userId);

	Set<ConcertDto> getConcertsOfUserSortedByDate(String user);

	void addNotesToConcert(String concertId, List<Integer> noteIdsToAdd,  final String userId);

	void removeNoteFromConcert(String concertId, int noteId, String user);
}
