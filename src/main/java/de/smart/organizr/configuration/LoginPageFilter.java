package de.smart.organizr.configuration;

import java.io.IOException;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import de.smart.organizr.utils.JsfUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.GenericFilterBean;

/**
 * If a user is logged in and tries to login again. He is redirected to the menu page.
 */
public class LoginPageFilter extends GenericFilterBean {

	@Override
	public void doFilter(final ServletRequest request, final ServletResponse response, final FilterChain chain) throws IOException,
			ServletException {
		if (JsfUtils.isResource(request, response, chain)) {
			return;
		}
		if (SecurityContextHolder.getContext().getAuthentication() != null
				&& SecurityContextHolder.getContext().getAuthentication().isAuthenticated()
				&& ((HttpServletRequest)request).getRequestURI().equals("/login")) {
			((HttpServletResponse)response).sendRedirect("/menu.xhtml");
			return;
		}
		chain.doFilter(request, response);
	}
}
