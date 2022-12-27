package de.smart.organizr.services.implementations;

import de.smart.organizr.dto.ConcertDto;
import de.smart.organizr.dto.ConcertPatchDto;
import de.smart.organizr.dto.ConcertPostDto;
import de.smart.organizr.dto.ConcertPostDtoMapper;
import de.smart.organizr.entities.classes.ConcertHibernateImpl;
import de.smart.organizr.entities.classes.NoteInConcert;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.exceptions.ConcertException;
import de.smart.organizr.exceptions.ElementException;
import de.smart.organizr.repositories.ConcertRepository;
import de.smart.organizr.repositories.NoteInConcertRepository;
import de.smart.organizr.repositories.NoteRepository;
import de.smart.organizr.repositories.UserRepository;
import de.smart.organizr.services.interfaces.ConcertService;
import lombok.AllArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@AllArgsConstructor
@Component
public class ConcertServiceImpl implements ConcertService {
	private final ConcertRepository concertRepository;
	private final NoteRepository noteRepository;

	private final NoteInConcertRepository noteInConcertRepository;
	private final ConcertPostDtoMapper concertPostDtoMapper;
	private final UserRepository userRepository;

	@Override
	public ConcertDto createConcertForUser(final ConcertPostDto concertPostDto, final String user){
		final ConcertHibernateImpl concertHibernate = concertPostDtoMapper.convertConcert(concertPostDto);
		final User userWhoOwnsConcert =
				userRepository.findByUserId(user).orElseThrow(()->new UsernameNotFoundException(user));
		concertHibernate.setId(UUID.randomUUID().toString());
		concertHibernate.setCreator(userWhoOwnsConcert);
		final ConcertHibernateImpl savedConcert =  concertRepository.save(concertHibernate);
		return concertPostDtoMapper.convertConcertToDto(savedConcert);
	}

	@Override
	public ConcertDto updateConcert(final ConcertPatchDto concertPatchDto, String id, String userId){
		final ConcertHibernateImpl concertHibernate =
				concertRepository.findConcertByIdAndUser(id,userId).orElseThrow(()-> new ConcertException("Concert " +
						"not found"));

		return concertPostDtoMapper.convertConcertToDto(concertHibernate);
	}

	@Override
	public Set<ConcertDto> getConcertsOfUserSortedByDate(final String userId) {
		final Set<ConcertHibernateImpl> concertsOfUser = concertRepository.findAllByUser(userId);

		return concertsOfUser.stream()
		                     .map(concertPostDtoMapper::convertConcertToDto)
		                     .collect(Collectors.toSet());
	}

	@Override
	@Transactional
	public void addNotesToConcert(final String concertId, final List<Integer> noteIdsToAdd, final String userId) {
		final ConcertHibernateImpl concertHibernate =
				concertRepository.findConcertByIdAndUser(concertId, userId).orElseThrow(()->new ConcertException(
				"Concert not found"));

		Random ran = new Random();

		final Collection<NoteInConcert> notesToAdd = noteIdsToAdd
				.stream()
				.map(id->noteRepository.findNoteByIdAndUser(id, userId).orElseThrow(()->ElementException.createElementUnknown(id)))
				.map(note->{
					NoteInConcert noteToSave = new NoteInConcert(note.getId(),note, ran.nextInt(100000));
					final NoteInConcert savedNote = noteInConcertRepository.save(noteToSave);
					return savedNote;
				})
				.toList();

		concertHibernate.getNoteInConcerts().addAll(notesToAdd);
	}

	@Override
	@Transactional
	public void removeNoteFromConcert(final String concertId, final int noteId, final String user) {
		final ConcertHibernateImpl concertHibernate =
				concertRepository.findConcertByIdAndUser(concertId, user).orElseThrow(()->new ConcertException(
						"Concert not found"));
		concertHibernate.getNoteInConcerts()
		                .removeIf(c->c.getNoteId()==noteId);
	}
}
