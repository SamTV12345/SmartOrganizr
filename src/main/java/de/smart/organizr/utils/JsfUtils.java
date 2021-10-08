package de.smart.organizr.utils;

import de.smart.organizr.entities.UserEntity;

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

public class JsfUtils {

	private static final String KEY_USER = "user";
	
	private static Flash getFlash() {
		return FacesContext.getCurrentInstance().getExternalContext().getFlash();
	}

	public static UserEntity putUserIntoFlash(final UserEntity userEntity) {
		return (UserEntity) getFlash().put(KEY_USER, userEntity);
	}

	public static UserEntity getUserFromFlash() {
		return (UserEntity) getFlash().get(KEY_USER);
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
	
}
