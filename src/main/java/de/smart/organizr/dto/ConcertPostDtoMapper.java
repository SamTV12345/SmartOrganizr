package de.smart.organizr.dto;

import de.smart.organizr.entities.classes.ConcertHibernateImpl;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ConcertPostDtoMapper {
	ConcertHibernateImpl convertConcert(ConcertPostDto concertPostDto);
}
