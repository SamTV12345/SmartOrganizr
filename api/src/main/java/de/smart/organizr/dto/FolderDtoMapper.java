package de.smart.organizr.dto;

import de.smart.organizr.entities.classes.FolderHibernateImpl;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface FolderDtoMapper {
	@Mapping(target = "length", expression =
			"java(folderHibernate.getElements()!= null ? folderHibernate.getElements().size():0)")
	FolderRepresentationalModel convertFolderToRep(FolderHibernateImpl folderHibernate);
}
