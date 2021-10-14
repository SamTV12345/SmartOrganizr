package de.smart.organizr.configuration;

import java.io.IOException;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import de.smart.organizr.entities.classes.UserHibernateImpl;
import de.smart.organizr.entities.interfaces.User;
import de.smart.organizr.utils.JsfUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.GenericFilterBean;

import de.smart.organizr.services.interfaces.UserService;

/**
 * Checks if the password is required to be changed. If yes, it needs to be changed correctly, in order to access
 * other pages.
 */
public class ChangePasswordFilter extends GenericFilterBean {
	private final UserService userService;

	public ChangePasswordFilter(final UserService userService) {
		this.userService = userService;
	}

	@Override
	public void doFilter(final ServletRequest request, final ServletResponse response, final FilterChain chain) throws
			IOException,
			ServletException {
		if (JsfUtils.isResource(request, response, chain)) {
			return;
		}
		if (SecurityContextHolder.getContext().getAuthentication() != null
				&& SecurityContextHolder.getContext().getAuthentication().isAuthenticated()) {
			final User user =
					userService.findUserByUserName(SecurityContextHolder.getContext().getAuthentication().getName())
					           .get();
			if (user.isPasswordResetRequired() && !((HttpServletRequest)request).getRequestURI().equals(
					"/changePassword.xhtml") ){
				((HttpServletResponse) response).sendRedirect("/changePassword.xhtml");
				return;
			}
		}
		chain.doFilter(request, response);
	}


}
