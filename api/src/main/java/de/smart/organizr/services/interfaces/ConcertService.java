package de.smart.organizr.services.interfaces;

import de.smart.organizr.dto.ConcertDto;
import de.smart.organizr.dto.ConcertPatchDto;
import de.smart.organizr.dto.ConcertPostDto;

import java.util.List;

public interface ConcertService {
	ConcertDto createConcertForUser(ConcertPostDto concertPostDto, final String user);

	ConcertDto updateConcert(ConcertPatchDto concertPatchDto, String id, String userId);

	List<ConcertDto> getConcertsOfUserSortedByDate(String user);

	void addNotesToConcert(String concertId, List<Integer> noteIdsToAdd,  final String userId);

	void removeNoteFromConcert(String concertId, int noteId, String user);

	void removeConcert(String concertId, String user);
}
