package de.smart.organizr.view;

import de.smart.organizr.entities.classes.AuthorHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.services.interfaces.AuthorService;
import de.smart.organizr.utils.JsfUtils;
import de.smart.organizr.utils.NavigationUtils;

import javax.faces.application.ViewHandler;
import javax.faces.component.UIViewRoot;
import javax.faces.context.FacesContext;

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
		return NavigationUtils.navigateToViewAuthors();
	}

	public void saveAndCreateAnotherAuthor(){
		authorService.saveAuthor(new AuthorHibernateImpl(id, name, extraInformation, userBean.getUser()));
		setId(0);
		setExtraInformation("");
		setName("");
		final FacesContext context = FacesContext.getCurrentInstance();
		final String viewId = context.getViewRoot().getViewId();
		final ViewHandler handler = context.getApplication().getViewHandler();
		final UIViewRoot root = handler.createView(context, viewId);
		root.setViewId(viewId);
		context.setViewRoot(root);
	}

	public String backToElementView(){
		return NavigationUtils.navigateToCorrectVersion(userBean.getVersion());
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
