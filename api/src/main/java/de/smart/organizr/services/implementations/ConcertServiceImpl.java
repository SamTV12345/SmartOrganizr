package de.smart.organizr.services.implementations;

import de.smart.organizr.dto.ConcertPatchDto;
import de.smart.organizr.dto.ConcertPostDto;
import de.smart.organizr.dto.ConcertPostDtoMapper;
import de.smart.organizr.entities.classes.ConcertHibernateImpl;
import de.smart.organizr.exceptions.ConcertException;
import de.smart.organizr.repositories.ConcertRepository;
import de.smart.organizr.services.interfaces.ConcertService;
import lombok.AllArgsConstructor;

@AllArgsConstructor
public class ConcertServiceImpl implements ConcertService {
	private final ConcertRepository concertRepository;
	private final ConcertPostDtoMapper concertPostDtoMapper;

	@Override
	public ConcertHibernateImpl createConcertForUser(final ConcertPostDto concertPostDto){
		final ConcertHibernateImpl concertHibernate = concertPostDtoMapper.convertConcert(concertPostDto);
		return concertRepository.save(concertHibernate);
	}

	@Override
	public ConcertHibernateImpl updateConcert(final ConcertPatchDto concertPatchDto, int id, String userId){
		final ConcertHibernateImpl concertHibernate =
				concertRepository.findConcertByIdAndUser(id,userId).orElseThrow(()-> new ConcertException("Concert " +
						"not found"));
		return concertHibernate;
	}
}
