package de.smart.organizr.dto;

import de.smart.organizr.entities.classes.FolderHibernateImpl;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ElementDtoMapper {
	ElementRepresentationModel convertToElementRepresentationModel(FolderHibernateImpl folderHibernate);

}
