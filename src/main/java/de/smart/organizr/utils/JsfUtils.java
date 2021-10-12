package de.smart.organizr.utils;

import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.entities.interfaces.Author;
import de.smart.organizr.entities.interfaces.Folder;
import de.smart.organizr.entities.interfaces.Note;

import java.io.IOException;

import javax.faces.application.FacesMessage;
import javax.faces.application.ResourceHandler;
import javax.faces.context.FacesContext;
import javax.faces.context.Flash;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;

public enum JsfUtils {
	;

	private static final String KEY_USER = "user";
	private static final String KEY_AUTHOR = "author";
	private static final String KEY_NOTE = "note";
	private static final String KEY_FOLDER = "folder";
	private static final String KEY_ANOTHER_FOLDER = "anotherFolder";



	private static Flash getFlash() {
		return FacesContext.getCurrentInstance().getExternalContext().getFlash();
	}

	public static UserHibernateImpl putUserIntoFlash(final UserHibernateImpl userHibernateImpl) {
		return (UserHibernateImpl) getFlash().put(KEY_USER, userHibernateImpl);
	}

	public static UserHibernateImpl getUserFromFlash() {
		return (UserHibernateImpl) getFlash().get(KEY_USER);
	}

	public static FacesMessage putErrorMessage(final String message) {
		final FacesMessage facesMessage = new FacesMessage(message);
		facesMessage.setSeverity(FacesMessage.SEVERITY_ERROR);
		FacesContext.getCurrentInstance().addMessage(null, facesMessage);
		return facesMessage;
	}

	public static boolean isResource(final ServletRequest request, final ServletResponse response,
	                               final FilterChain chain)
			throws IOException, ServletException {
		final HttpServletRequest httpRequest = (HttpServletRequest) request;
		if (httpRequest.getRequestURI().startsWith(httpRequest.getContextPath() + ResourceHandler.RESOURCE_IDENTIFIER)) {
			chain.doFilter(request, response);
			return true;
		}
		return false;
	}

	public static void putFolderIntoFlash(final Folder folder){
		getFlash().put(KEY_FOLDER, folder);
	}

	public static Folder getFolderFromFlash() {
		return (Folder) getFlash().get(KEY_FOLDER);
	}

	public static Folder getAnotherFolderFromFlash() {
		return (Folder) getFlash().get(KEY_ANOTHER_FOLDER);
	}

	public static void putAuthorIntoFlash(final Author author) {
		getFlash().put(KEY_AUTHOR,author);
	}

	public static Author getAuthorFromFlash() {
		return (Author) getFlash().get(KEY_AUTHOR);
	}

	public static void putNoteIntoFlash(final Note note) {
		getFlash().put(KEY_NOTE, note);
	}

	public static Note getNoteFromFlash() {
		return (Note) getFlash().get(KEY_NOTE);
	}

	public Folder getAnotherFolder(){
		return (Folder) getFlash().get(KEY_ANOTHER_FOLDER);
	}

	public static Folder putAnotherFolderIntoFlash(final Folder folder){
		return (Folder) getFlash().put(KEY_ANOTHER_FOLDER,folder);
	}
}
