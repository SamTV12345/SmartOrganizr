package de.smart.organizr.view.converters;

import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.services.interfaces.AuthorService;
import de.smart.organizr.view.UserBean;

import javax.faces.component.UIComponent;
import javax.faces.context.FacesContext;
import javax.faces.convert.Converter;

public class AuthorConverter implements Converter<Author> {
	private final AuthorService authorService;
	private final UserBean userBean;

	public AuthorConverter(final AuthorService authorService, final UserBean userBean) {
		this.authorService = authorService;
		this.userBean = userBean;
	}


	@Override
	public Author getAsObject(final FacesContext facesContext, final UIComponent uiComponent, final String s) {
		return authorService.findAuthorByUserAndName(userBean.getUser(), s).orElse(null);
	}

	@Override
	public String getAsString(final FacesContext facesContext, final UIComponent uiComponent, final Author author) {
		if(author!=null) {
			return author.getName();
		}
		else{
			return null;
		}
	}
}
