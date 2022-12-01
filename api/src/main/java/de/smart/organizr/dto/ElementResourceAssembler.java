package de.smart.organizr.dto;

import de.smart.organizr.entities.classes.FolderHibernateImpl;
import de.smart.organizr.entities.interfaces.Folder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.server.mvc.RepresentationModelAssemblerSupport;
import org.springframework.stereotype.Component;

@Component
public class ElementResourceAssembler extends RepresentationModelAssemblerSupport<Folder,ElementRepresentationModel> {
	@Autowired
	private ElementDtoMapper elementDtoMapper;

	public ElementResourceAssembler() {
		super(Folder.class, ElementRepresentationModel.class);
	}

	@Override
	public ElementRepresentationModel toModel(final Folder entity) {
		return elementDtoMapper.convertToElementRepresentationModel((FolderHibernateImpl) entity);
	}
}
