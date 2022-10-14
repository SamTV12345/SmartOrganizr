package de.smart.organizr.dto;

import de.smart.organizr.entities.classes.AuthorHibernateImpl;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AuthorPatchDtoMapper {
	@Mapping(target = "id", source = "authorId")
	AuthorHibernateImpl convertAuthor(AuthorPatchDto authorPatchDto, String authorId);
}
