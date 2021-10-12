package de.smart.organizr.view;

import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.services.interfaces.AuthorService;
import de.smart.organizr.utils.JsfUtils;

import java.util.Collection;

public class ViewAuthorView {
	private final AuthorService authorService;
	private final UserBean userBean;

	public ViewAuthorView(final AuthorService authorService, final UserBean userBean) {
		this.authorService = authorService;
		this.userBean = userBean;
	}

	public Collection<Author> getAllAuthors(){
		return authorService.findAllAuthorsByUser(userBean.getUser().getUserId());
	}

	public String navigateToEditAuthor(){
		return "/editAuthor.xhtml";
	}

	public String navigateToEditAuthor(final Author author){
		JsfUtils.putAuthorIntoFlash(author);
		return "/editAuthor.xhtml";
	}

	public void deleteAuthor(final Author author) {
		authorService.deleteAuthor(author);
	}
}
