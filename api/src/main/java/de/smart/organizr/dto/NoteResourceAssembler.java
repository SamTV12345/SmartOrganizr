package de.smart.organizr.dto;

import de.smart.organizr.entities.classes.NoteHibernateImpl;
import de.smart.organizr.entities.interfaces.Note;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.server.mvc.RepresentationModelAssemblerSupport;
import org.springframework.stereotype.Component;

@Component
public class NoteResourceAssembler extends RepresentationModelAssemblerSupport<Note,NoteRepresentationModel> {
	@Autowired
	private ElementDtoMapper elementDtoMapper;

	public NoteResourceAssembler() {
		super(Note.class, NoteRepresentationModel.class);
	}

	@Override
	public NoteRepresentationModel toModel(final Note entity) {
		return elementDtoMapper.convertToElementRepresentationModel((NoteHibernateImpl) entity);
	}
}
