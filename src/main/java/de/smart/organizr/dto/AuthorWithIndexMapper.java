package de.smart.organizr.dto;

import de.smart.organizr.entities.interfaces.Author;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AuthorWithIndexMapper {
	@Mapping(target = "index", source = "index")
	AuthorWithIndex convertAuthor(Author author,int index);
}
