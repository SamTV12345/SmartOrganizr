package de.smart.organizr.dto;

import de.smart.organizr.entities.classes.AuthorHibernateImpl;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AuthorDtoMapper {
	AuthorRepresentationModel convertAuthorToRep(AuthorHibernateImpl author);
}
