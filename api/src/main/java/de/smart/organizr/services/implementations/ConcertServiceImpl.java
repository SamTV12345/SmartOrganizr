package de.smart.organizr.services.implementations;

import de.smart.organizr.dto.ConcertDto;
import de.smart.organizr.dto.ConcertPatchDto;
import de.smart.organizr.dto.ConcertPostDto;
import de.smart.organizr.dto.ConcertPostDtoMapper;
import de.smart.organizr.entities.classes.ConcertHibernateImpl;
import de.smart.organizr.exceptions.ConcertException;
import de.smart.organizr.repositories.ConcertRepository;
import de.smart.organizr.services.interfaces.ConcertService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.stream.Collectors;

@AllArgsConstructor
@Component
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

	@Override
	public Set<ConcertDto> getConcertsOfUserSortedByDate(final String userId) {
		final Set<ConcertHibernateImpl> concertsOfUser = concertRepository.findAllByUser(userId);

		return concertsOfUser.stream()
		                     .map(concertPostDtoMapper::convertConcertToDto)
		                     .collect(Collectors.toSet());
	}
}
