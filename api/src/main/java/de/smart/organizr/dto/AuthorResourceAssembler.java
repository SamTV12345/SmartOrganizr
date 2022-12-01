package de.smart.organizr.dto;

import de.smart.organizr.entities.classes.AuthorHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.server.mvc.RepresentationModelAssemblerSupport;
import org.springframework.stereotype.Component;

@Component
public class AuthorResourceAssembler extends RepresentationModelAssemblerSupport<Author,AuthorRepresentationModel> {
	@Autowired
	private AuthorDtoMapper authorDtoMapper;

	public AuthorResourceAssembler() {
		super(Author.class, AuthorRepresentationModel.class);
	}

	@Override
	public AuthorRepresentationModel toModel(final Author entity) {
		return authorDtoMapper.convertAuthorToRep((AuthorHibernateImpl) entity);
	}
}
