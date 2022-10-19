package de.smart.organizr.services.implementations;

import de.smart.organizr.dto.ConcertPatchDto;
import de.smart.organizr.dto.ConcertPostDto;
import de.smart.organizr.dto.ConcertPostDtoMapper;
import de.smart.organizr.entities.classes.ConcertHibernateImpl;
import de.smart.organizr.entities.classes.NoteInConcert;
import de.smart.organizr.exceptions.ConcertException;
import de.smart.organizr.repositories.ConcertRepository;
import de.smart.organizr.services.interfaces.ConcertService;
import lombok.AllArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

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
	@Transactional
	public ConcertHibernateImpl updateConcert(final ConcertPatchDto concertPatchDto, int id, String userId){
		final ConcertHibernateImpl concertHibernate =
				concertRepository.findConcertByIdAndUser(id,userId).orElseThrow(()-> new ConcertException("Concert " +
						"not found"));
		concertHibernate.setDescription(concertPatchDto.getDescription());
		concertHibernate.setLocation(concertPatchDto.getLocation());
		concertHibernate.setDueDate(concertPatchDto.getDueDate());
		concertHibernate.setTitle(concertPatchDto.getTitle());
		return concertHibernate;
	}

	@Override
	public ConcertHibernateImpl addNoteToConcert(final NoteInConcert noteInConcert, final String userId) {
		return null;
	}

	@Override
	@Transactional
	public ConcertHibernateImpl addNoteToConcert(final int concertId,NoteInConcert noteInConcert, String userId){
		final ConcertHibernateImpl concertHibernate =
				concertRepository.findConcertByIdAndUser(concertId,userId).orElseThrow(()-> new ConcertException("Concert " +
						"not found"));
		return null;
	}
}
