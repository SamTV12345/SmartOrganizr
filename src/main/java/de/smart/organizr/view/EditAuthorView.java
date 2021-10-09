package de.smart.organizr.view;

import de.smart.organizr.entities.classes.AuthorHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.services.interfaces.AuthorService;
import de.smart.organizr.utils.JsfUtils;

public class EditAuthorView {
	private final AuthorService authorService;
	private final UserBean userBean;
	private String name;
	private int id;
	private String extraInformation;

	public EditAuthorView(final UserBean userBean, final AuthorService authorService) {
		final Author authorFromFlash = JsfUtils.getAuthorFromFlash();
		if(authorFromFlash !=null){
			setId(authorFromFlash.getId());
			setName(authorFromFlash.getName());
			setExtraInformation(authorFromFlash.getExtraInformation());
		}
		this.userBean = userBean;
		this.authorService = authorService;
	}

	public String saveAuthor(){
		authorService.saveAuthor(new AuthorHibernateImpl(id, name, extraInformation, userBean.getUser()));
		return "/viewAuthors.xhtml";
	}

	public String getName() {
		return name;
	}

	public void setName(final String name) {
		this.name = name;
	}

	public String getExtraInformation() {
		return extraInformation;
	}

	public void setExtraInformation(final String extraInformation) {
		this.extraInformation = extraInformation;
	}

	public int getId() {
		return id;
	}

	public void setId(final int id) {
		this.id = id;
	}
}
