package de.smart.organizr.configuration;

import org.springframework.web.filter.GenericFilterBean;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class RootRedirect extends GenericFilterBean {
	@Override
	public void doFilter(final ServletRequest servletRequest, final ServletResponse servletResponse,
	                     final FilterChain filterChain)
			throws IOException, ServletException {
		if(((HttpServletRequest) servletRequest).getRequestURI().equals("/")){
			((HttpServletResponse) servletResponse).sendRedirect("/menu.xhtml");
			return;
		}
		filterChain.doFilter(servletRequest, servletResponse);
	}
}
